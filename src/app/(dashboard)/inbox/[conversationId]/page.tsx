import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { formatDateTime } from "@/lib/format";
import { sendReplyAction, createJobFromMessageAction } from "@/lib/actions/messages";
import type { ExtractedJobInfo } from "@/lib/ai";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  await requireSession();

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      customer: true,
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!conversation) notFound();

  const existingJobsCount = await prisma.job.count({
    where: { customerId: conversation.customerId },
  });

  const lastInbound = [...conversation.messages]
    .reverse()
    .find((m) => m.direction === "inbound" && m.aiExtracted);

  const extracted = lastInbound?.aiExtracted as
    | (ExtractedJobInfo & { suggestedReply?: string })
    | null
    | undefined;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
        <div>
          <p className="font-semibold text-slate-900">{conversation.customer.name}</p>
          <p className="text-xs text-slate-500">📱 {conversation.customer.phone}</p>
        </div>
        {existingJobsCount > 0 && (
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
            {existingJobsCount} past job{existingJobsCount > 1 ? "s" : ""}
          </span>
        )}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-6">
        {conversation.messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.direction === "outbound" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-md rounded-2xl px-4 py-2 text-sm ${
                m.direction === "outbound"
                  ? "bg-emerald-500 text-white"
                  : "bg-white text-slate-800 shadow-sm"
              }`}
            >
              <p>{m.text}</p>
              <p
                className={`mt-1 text-[10px] ${
                  m.direction === "outbound" ? "text-emerald-100" : "text-slate-400"
                }`}
              >
                {formatDateTime(m.createdAt)}
              </p>
            </div>
          </div>
        ))}

        {extracted && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-700">
              ✨ AI detected
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-emerald-900">
              <span className="text-emerald-600">Service</span>
              <span className="font-medium">{extracted.serviceType}</span>
              <span className="text-emerald-600">Issue</span>
              <span className="font-medium">{extracted.problem}</span>
              {extracted.preferredTime && (
                <>
                  <span className="text-emerald-600">Preferred time</span>
                  <span className="font-medium">{extracted.preferredTime}</span>
                </>
              )}
              {extracted.estimatedMin != null && (
                <>
                  <span className="text-emerald-600">Est. value</span>
                  <span className="font-medium">
                    ₹{extracted.estimatedMin}–₹{extracted.estimatedMax}
                  </span>
                </>
              )}
            </div>
            {extracted.intent !== "payment" && lastInbound && (
              <form action={createJobFromMessageAction} className="mt-3">
                <input type="hidden" name="messageId" value={lastInbound.id} />
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  ✨ Create Job
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      <form action={sendReplyAction} className="flex items-end gap-2 border-t border-slate-200 bg-white p-4">
        <input type="hidden" name="conversationId" value={conversation.id} />
        <textarea
          name="text"
          rows={2}
          defaultValue={extracted?.suggestedReply ?? ""}
          placeholder="Type a reply..."
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
        <button
          type="submit"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Send
        </button>
      </form>
    </div>
  );
}
