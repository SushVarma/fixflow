"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

export async function markPaidAction(formData: FormData) {
  await requireSession();
  const paymentId = String(formData.get("paymentId") ?? "");
  const method = String(formData.get("method") ?? "upi");
  if (!paymentId) return;

  const payment = await prisma.payment.update({
    where: { id: paymentId },
    data: { status: "paid", method, paidAt: new Date() },
  });

  await prisma.jobEvent.create({
    data: { jobId: payment.jobId, type: "payment_received", note: `₹${payment.amount} via ${method}` },
  });

  const job = await prisma.job.findUnique({
    where: { id: payment.jobId },
    include: { customer: true },
  });
  if (job) {
    const conversation = await prisma.conversation.findFirst({
      where: { customerId: job.customerId },
      orderBy: { lastMessageAt: "desc" },
    });
    if (conversation) {
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          direction: "outbound",
          text: `Payment of ₹${payment.amount} received, thank you ${job.customer.name}!`,
        },
      });
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: new Date() },
      });
    }
  }

  revalidatePath("/payments");
  revalidatePath(`/jobs/${payment.jobId}`);
  revalidatePath("/dashboard");
}
