"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { ExtractedJobInfo } from "@/lib/ai";
import { requireSession } from "@/lib/session";
import { processInboundMessage } from "@/lib/whatsapp";

/**
 * Simulates an inbound WhatsApp message arriving at the business's number.
 * Shares its processing pipeline with the real Meta Cloud API webhook
 * (see /api/whatsapp/webhook) so swapping in real credentials later only
 * changes where this data originates, not how it's processed.
 */
export async function simulateInboundMessageAction(formData: FormData) {
  const session = await requireSession();
  const phone = String(formData.get("phone") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim() || "New Customer";
  const text = String(formData.get("text") ?? "").trim();
  if (!phone || !text) return;

  const { conversation } = await processInboundMessage({
    businessId: session.businessId,
    phone,
    name,
    text,
  });

  revalidatePath("/inbox");
  revalidatePath("/dashboard");
  redirect(`/inbox/${conversation.id}`);
}

export async function sendReplyAction(formData: FormData) {
  await requireSession();
  const conversationId = String(formData.get("conversationId") ?? "");
  const text = String(formData.get("text") ?? "").trim();
  if (!conversationId || !text) return;

  await prisma.message.create({
    data: { conversationId, direction: "outbound", text },
  });
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { lastMessageAt: new Date() },
  });

  revalidatePath(`/inbox/${conversationId}`);
  revalidatePath("/inbox");
}

export async function createJobFromMessageAction(formData: FormData) {
  const session = await requireSession();
  const messageId = String(formData.get("messageId") ?? "");

  const message = await prisma.message.findUnique({
    where: { id: messageId },
    include: { conversation: { include: { customer: true } } },
  });
  if (!message || !message.aiExtracted) return;

  const extracted = message.aiExtracted as unknown as ExtractedJobInfo;
  const customer = message.conversation.customer;

  const job = await prisma.job.create({
    data: {
      businessId: session.businessId,
      customerId: customer.id,
      serviceType: extracted.serviceType,
      problem: extracted.problem,
      address: customer.address ?? "Address to be confirmed",
      estimatedMin: extracted.estimatedMin,
      estimatedMax: extracted.estimatedMax,
    },
  });

  await prisma.jobEvent.create({
    data: { jobId: job.id, type: "created", note: "Created from WhatsApp conversation" },
  });

  revalidatePath("/inbox");
  revalidatePath("/dashboard");
  revalidatePath("/customers");
  redirect(`/jobs/${job.id}`);
}

export async function sendFollowUpAction(formData: FormData) {
  await requireSession();
  const customerId = String(formData.get("customerId") ?? "");
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) return;

  let conversation = await prisma.conversation.findFirst({
    where: { customerId, status: "open" },
    orderBy: { lastMessageAt: "desc" },
  });
  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: { businessId: customer.businessId, customerId },
    });
  }

  const lastJob = await prisma.job.findFirst({
    where: { customerId, status: "completed" },
    orderBy: { completedAt: "desc" },
  });

  const monthsAgo = lastJob?.completedAt
    ? Math.max(1, Math.round((Date.now() - lastJob.completedAt.getTime()) / (30 * 24 * 60 * 60 * 1000)))
    : null;

  const text = monthsAgo
    ? `Hi ${customer.name}, it's been about ${monthsAgo} month${monthsAgo > 1 ? "s" : ""} since your last ${lastJob?.serviceType ?? "service"}. Would you like to schedule a follow-up service?`
    : `Hi ${customer.name}, just checking in — would you like to schedule a service with us?`;

  await prisma.message.create({
    data: { conversationId: conversation.id, direction: "outbound", text },
  });
  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { lastMessageAt: new Date() },
  });

  revalidatePath("/customers");
  revalidatePath(`/customers/${customerId}`);
  revalidatePath("/inbox");
}
