import { InferenceClient } from "@huggingface/inference";

const MODEL = "Qwen/Qwen2.5-7B-Instruct";

function getClient(): InferenceClient | null {
  const token = process.env.HF_TOKEN;
  if (!token) return null;
  return new InferenceClient(token);
}

export type MessageIntent = "repair" | "service" | "question" | "payment" | "other";

export interface ExtractedJobInfo {
  intent: MessageIntent;
  serviceType: string;
  problem: string;
  urgency: "normal" | "urgent";
  preferredTime: string | null;
  estimatedMin: number | null;
  estimatedMax: number | null;
}

export interface CustomerContext {
  customerName: string;
  isReturning: boolean;
  lastServiceType?: string;
  lastServiceDate?: string;
}

/** Pulls the first {...} block out of a model reply and parses it as JSON.
 * Open instruct models often wrap JSON in prose or markdown fences even when
 * told not to, so this is more robust than a strict JSON.parse. */
function extractJson(text: string): unknown | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const braceMatch = candidate.match(/\{[\s\S]*\}/);
  if (!braceMatch) return null;
  try {
    return JSON.parse(braceMatch[0]);
  } catch {
    return null;
  }
}

function isExtractedJobInfo(value: unknown): value is ExtractedJobInfo {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.intent === "string" &&
    typeof v.serviceType === "string" &&
    typeof v.problem === "string" &&
    typeof v.urgency === "string"
  );
}

export async function extractJobInfo(
  message: string,
  context: CustomerContext
): Promise<ExtractedJobInfo> {
  const client = getClient();
  if (!client) return ruleBasedExtract(message);

  try {
    const contextLine = context.isReturning
      ? `Returning customer. Last service: ${context.lastServiceType ?? "unknown"} on ${
          context.lastServiceDate ?? "unknown date"
        }.`
      : "New customer, no prior service history.";

    const response = await client.chatCompletion({
      model: MODEL,
      max_tokens: 400,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You are the AI layer inside FixFlow, an operations platform for home-appliance service businesses in India. " +
            "Extract structured job details from a customer's WhatsApp message. Messages may be in English, Hindi, or Hinglish. " +
            "Give a realistic INR cost estimate range for the described problem when possible. " +
            'Reply with ONLY a single JSON object, no prose, no markdown fences, matching exactly this shape: ' +
            '{"intent":"repair|service|question|payment|other","serviceType":"string","problem":"string","urgency":"normal|urgent","preferredTime":"string or null","estimatedMin":"number or null","estimatedMax":"number or null"}',
        },
        {
          role: "user",
          content: `Customer: ${context.customerName}\n${contextLine}\n\nMessage: "${message}"`,
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    const parsed = content ? extractJson(content) : null;
    if (isExtractedJobInfo(parsed)) return parsed;
    return ruleBasedExtract(message);
  } catch {
    return ruleBasedExtract(message);
  }
}

export async function generateReply(
  message: string,
  extracted: ExtractedJobInfo,
  context: CustomerContext
): Promise<string> {
  const client = getClient();
  if (!client) return ruleBasedReply(extracted, context);

  try {
    const response = await client.chatCompletion({
      model: MODEL,
      max_tokens: 150,
      temperature: 0.4,
      messages: [
        {
          role: "system",
          content:
            "You are a friendly, concise WhatsApp assistant for an AC/appliance repair business in Mumbai. " +
            "Reply in the customer's own language/style (English, Hindi, or Hinglish). Keep it to 1-2 short sentences, plain text only. " +
            "Confirm you understood the issue and propose next steps (a visit window), but never confirm exact pricing or promise a specific technician.",
        },
        {
          role: "user",
          content: `Customer "${context.customerName}" wrote: "${message}"\nDetected issue: ${extracted.problem} (${extracted.serviceType}).\nDraft a short WhatsApp reply.`,
        },
      ],
    });
    const text = response.choices[0]?.message?.content?.trim();
    return text || ruleBasedReply(extracted, context);
  } catch {
    return ruleBasedReply(extracted, context);
  }
}

export async function summarizeConversation(
  transcript: string
): Promise<string> {
  const client = getClient();
  if (!client) return "Summary unavailable (AI not configured).";

  try {
    const response = await client.chatCompletion({
      model: MODEL,
      max_tokens: 150,
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content:
            "Summarize this WhatsApp support conversation for a service-business owner in 1-2 sentences. Focus on the issue, diagnosis, and outcome.",
        },
        { role: "user", content: transcript },
      ],
    });
    const text = response.choices[0]?.message?.content?.trim();
    return text || "Summary unavailable.";
  } catch {
    return "Summary unavailable.";
  }
}

// ---------------------------------------------------------------------------
// Deterministic fallback so the product demo works end-to-end even without
// an HF_TOKEN configured.
// ---------------------------------------------------------------------------

const KEYWORD_RULES: Array<{
  match: RegExp;
  serviceType: string;
  problem: string;
  urgency: "normal" | "urgent";
  estimatedMin: number;
  estimatedMax: number;
}> = [
  {
    match: /(cooling|thand[aā]?\s*nahi|not cool|gas)/i,
    serviceType: "AC Repair",
    problem: "AC not cooling / possible gas issue",
    urgency: "normal",
    estimatedMin: 1200,
    estimatedMax: 2800,
  },
  {
    match: /(water|leak|p[aā]ni|drainage)/i,
    serviceType: "AC Repair",
    problem: "Water leakage from AC unit",
    urgency: "urgent",
    estimatedMin: 800,
    estimatedMax: 1800,
  },
  {
    match: /(install|naya|new ac|fitting)/i,
    serviceType: "AC Installation",
    problem: "New AC installation request",
    urgency: "normal",
    estimatedMin: 1500,
    estimatedMax: 3500,
  },
  {
    match: /(service|clean|servicing|karwani)/i,
    serviceType: "AC Service",
    problem: "Routine AC service/cleaning requested",
    urgency: "normal",
    estimatedMin: 600,
    estimatedMax: 1200,
  },
  {
    match: /(paid|payment|paisa|bhej diya|utr|upi)/i,
    serviceType: "Payment",
    problem: "Customer payment confirmation",
    urgency: "normal",
    estimatedMin: 0,
    estimatedMax: 0,
  },
  {
    match: /(noise|sound|awaz)/i,
    serviceType: "Appliance Repair",
    problem: "Unusual noise from appliance",
    urgency: "normal",
    estimatedMin: 500,
    estimatedMax: 1500,
  },
];

function ruleBasedExtract(message: string): ExtractedJobInfo {
  const rule = KEYWORD_RULES.find((r) => r.match.test(message));
  if (!rule) {
    return {
      intent: "question",
      serviceType: "General Inquiry",
      problem: message.slice(0, 140),
      urgency: "normal",
      preferredTime: null,
      estimatedMin: null,
      estimatedMax: null,
    };
  }

  const timeMatch = message.match(
    /(today|tomorrow|kal|aaj|\d{1,2}\s*(am|pm)|\d{1,2}[-:]\d{2})/i
  );

  return {
    intent: rule.serviceType === "Payment" ? "payment" : "repair",
    serviceType: rule.serviceType,
    problem: rule.problem,
    urgency: rule.urgency,
    preferredTime: timeMatch ? timeMatch[0] : null,
    estimatedMin: rule.estimatedMin || null,
    estimatedMax: rule.estimatedMax || null,
  };
}

function ruleBasedReply(
  extracted: ExtractedJobInfo,
  context: CustomerContext
): string {
  if (extracted.intent === "payment") {
    return `Thank you ${context.customerName}, we've received your payment confirmation. Our team will verify and update your invoice shortly.`;
  }
  return `Sure ${context.customerName}, we can arrange a technician for "${extracted.problem}". Would 3-5 PM or 5-7 PM work better today?`;
}
