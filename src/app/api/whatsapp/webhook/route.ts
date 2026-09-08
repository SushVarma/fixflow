import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { processInboundMessage, resolveBusinessForWhatsappNumber } from "@/lib/whatsapp";

/**
 * Real Meta WhatsApp Business Cloud API webhook endpoint.
 * https://developers.facebook.com/docs/whatsapp/cloud-api/guides/set-up-webhooks
 *
 * Not used by the in-app demo (which uses the simulator in the Inbox screen),
 * but point Meta's webhook configuration at this URL and it will process real
 * incoming messages through the same pipeline — no other code changes needed.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
  if (mode === "subscribe" && verifyToken && token === verifyToken) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

interface MetaWebhookPayload {
  entry?: Array<{
    changes?: Array<{
      value?: {
        metadata?: { display_phone_number?: string };
        contacts?: Array<{ profile?: { name?: string }; wa_id?: string }>;
        messages?: Array<{
          from?: string;
          type?: string;
          text?: { body?: string };
        }>;
      };
    }>;
  }>;
}

export async function POST(request: NextRequest) {
  let payload: MetaWebhookPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      const displayNumber = value?.metadata?.display_phone_number;
      const business = await resolveBusinessForWhatsappNumber(displayNumber);
      if (!business) continue;

      for (const message of value?.messages ?? []) {
        if (message.type !== "text" || !message.from || !message.text?.body) continue;

        const contact = value?.contacts?.find((c) => c.wa_id === message.from);

        await processInboundMessage({
          businessId: business.id,
          phone: message.from,
          name: contact?.profile?.name,
          text: message.text.body,
        });
      }
    }
  }

  // Meta requires a fast 200 OK regardless of processing outcome.
  return NextResponse.json({ ok: true });
}
