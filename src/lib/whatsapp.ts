import { prisma } from "@/lib/prisma";
import { extractJobInfo, generateReply } from "@/lib/ai";
import type { Prisma } from "@prisma/client";

/**
 * Core inbound-message pipeline, shared by:
 *  - the in-app WhatsApp simulator (lib/actions/messages.ts), used while no
 *    real Meta credentials are configured
 *  - the real Meta Cloud API webhook (app/api/whatsapp/webhook/route.ts)
 *
 * Swapping from simulated to real WhatsApp only changes who calls this
 * function, not what it does.
 */
export async function processInboundMessage(input: {
  businessId: string;
  phone: string;
  name?: string;
  text: string;
}) {
  const { businessId, phone, text } = input;
  const name = input.name?.trim() || phone;

  const customer = await prisma.customer.upsert({
    where: { businessId_phone: { businessId, phone } },
    update: {},
    create: { businessId, phone, name },
  });

  let conversation = await prisma.conversation.findFirst({
    where: { businessId, customerId: customer.id, status: "open" },
    orderBy: { lastMessageAt: "desc" },
  });
  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: { businessId, customerId: customer.id },
    });
  }

  const priorJob = await prisma.job.findFirst({
    where: { customerId: customer.id, status: "completed" },
    orderBy: { completedAt: "desc" },
  });

  const context = {
    customerName: customer.name,
    isReturning: !!priorJob,
    lastServiceType: priorJob?.serviceType,
    lastServiceDate: priorJob?.completedAt?.toISOString(),
  };

  const extracted = await extractJobInfo(text, context);
  const suggestedReply = await generateReply(text, extracted, context);

  const message = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      direction: "inbound",
      text,
      aiIntent: extracted.intent,
      aiExtracted: { ...extracted, suggestedReply } as unknown as Prisma.InputJsonValue,
    },
  });

  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { lastMessageAt: new Date(), status: "open" },
  });

  return { conversation, message, customer };
}

/** Resolves which seeded business a webhook delivery belongs to. Single-tenant
 * demo: falls back to the only business row when no number match is found. */
export async function resolveBusinessForWhatsappNumber(displayNumber?: string) {
  if (displayNumber) {
    const match = await prisma.business.findFirst({ where: { whatsappNumber: displayNumber } });
    if (match) return match;
  }
  return prisma.business.findFirst();
}
