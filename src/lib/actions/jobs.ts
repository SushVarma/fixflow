"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import type { Prisma } from "@prisma/client";

async function notifyCustomer(jobId: string, text: string) {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: { customer: true },
  });
  if (!job) return;

  let conversation = await prisma.conversation.findFirst({
    where: { customerId: job.customerId },
    orderBy: { lastMessageAt: "desc" },
  });
  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: { businessId: job.businessId, customerId: job.customerId },
    });
  }

  await prisma.message.create({
    data: { conversationId: conversation.id, direction: "outbound", text },
  });
  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { lastMessageAt: new Date() },
  });
}

export async function assignTechnicianAction(formData: FormData) {
  await requireSession();
  const jobId = String(formData.get("jobId") ?? "");
  const technicianId = String(formData.get("technicianId") ?? "");
  const scheduledAtRaw = String(formData.get("scheduledAt") ?? "");
  if (!jobId || !technicianId || !scheduledAtRaw) return;

  const scheduledAt = new Date(scheduledAtRaw);
  const technician = await prisma.technician.findUnique({ where: { id: technicianId } });

  await prisma.job.update({
    where: { id: jobId },
    data: { technicianId, scheduledAt, status: "scheduled" },
  });
  await prisma.jobEvent.create({
    data: {
      jobId,
      type: "assigned",
      note: `Assigned to ${technician?.name ?? "technician"} for ${scheduledAt.toLocaleString("en-IN")}`,
    },
  });

  await notifyCustomer(
    jobId,
    `Your service has been scheduled for ${scheduledAt.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    })}. Our technician ${technician?.name ?? ""} will visit you then.`
  );

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath(`/technician/${technicianId}`);
  revalidatePath("/dashboard");
  revalidatePath("/inbox");
}

export async function rescheduleJobAction(formData: FormData) {
  await requireSession();
  const jobId = String(formData.get("jobId") ?? "");
  const scheduledAtRaw = String(formData.get("scheduledAt") ?? "");
  if (!jobId || !scheduledAtRaw) return;

  const scheduledAt = new Date(scheduledAtRaw);
  const job = await prisma.job.update({ where: { id: jobId }, data: { scheduledAt } });
  await prisma.jobEvent.create({
    data: { jobId, type: "rescheduled", note: `Rescheduled to ${scheduledAt.toLocaleString("en-IN")}` },
  });

  await notifyCustomer(
    jobId,
    `Your appointment has been rescheduled to ${scheduledAt.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    })}.`
  );

  revalidatePath(`/jobs/${jobId}`);
  if (job.technicianId) revalidatePath(`/technician/${job.technicianId}`);
  revalidatePath("/dashboard");
}

// Called from the public, unauthenticated /technician/[id] page — no owner
// session exists there, so this intentionally does not call requireSession().
export async function startJobAction(formData: FormData) {
  const jobId = String(formData.get("jobId") ?? "");
  if (!jobId) return;

  const job = await prisma.job.update({
    where: { id: jobId },
    data: { status: "in_progress", startedAt: new Date() },
  });
  await prisma.jobEvent.create({ data: { jobId, type: "started" } });

  revalidatePath(`/jobs/${jobId}`);
  if (job.technicianId) revalidatePath(`/technician/${job.technicianId}`);
  revalidatePath("/dashboard");
}

const WARRANTY_DAYS: Record<string, number> = {
  "AC Installation": 365,
  "AC Repair": 90,
  "AC Service": 60,
  "Appliance Repair": 90,
};

// Called from the public, unauthenticated /technician/[id] page — no owner
// session exists there, so this intentionally does not call requireSession().
export async function completeJobAction(formData: FormData) {
  const jobId = String(formData.get("jobId") ?? "");
  const findings = formData.getAll("findings").map(String);
  const partNames = formData.getAll("partName").map(String);
  const partCosts = formData.getAll("partCost").map(Number);
  const laborCharge = Number(formData.get("laborCharge") ?? 0);
  if (!jobId) return;

  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) return;

  const partsUsed = partNames
    .map((name, i) => ({ name, cost: partCosts[i] || 0 }))
    .filter((p) => p.name.trim().length > 0);
  const partsTotal = partsUsed.reduce((sum, p) => sum + p.cost, 0);
  const totalAmount = partsTotal + laborCharge;

  await prisma.job.update({
    where: { id: jobId },
    data: {
      status: "completed",
      completedAt: new Date(),
      findings,
      partsUsed: partsUsed as unknown as Prisma.InputJsonValue,
      laborCharge,
      totalAmount,
    },
  });

  await prisma.jobEvent.create({
    data: { jobId, type: "completed", note: `Total amount: ₹${totalAmount}` },
  });

  await prisma.payment.create({
    data: {
      businessId: job.businessId,
      jobId,
      amount: totalAmount,
      status: "pending",
    },
  });
  await prisma.jobEvent.create({ data: { jobId, type: "payment_requested" } });

  const warrantyDays = WARRANTY_DAYS[job.serviceType] ?? 90;
  await prisma.warranty.upsert({
    where: { jobId },
    update: { expiresAt: new Date(Date.now() + warrantyDays * 24 * 60 * 60 * 1000) },
    create: {
      jobId,
      expiresAt: new Date(Date.now() + warrantyDays * 24 * 60 * 60 * 1000),
    },
  });

  await notifyCustomer(
    jobId,
    `Your service has been completed. Amount payable: ₹${totalAmount}. You're covered under a ${warrantyDays}-day warranty.`
  );

  revalidatePath(`/jobs/${jobId}`);
  if (job.technicianId) revalidatePath(`/technician/${job.technicianId}`);
  revalidatePath("/dashboard");
  revalidatePath("/payments");
  revalidatePath("/customers");
}
