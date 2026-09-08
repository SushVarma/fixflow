import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { timeAgo } from "@/lib/format";
import { SimulateMessageForm } from "./simulate-message-form";

export default async function InboxLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();

  const conversations = await prisma.conversation.findMany({
    where: { businessId: session.businessId },
    include: {
      customer: true,
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { lastMessageAt: "desc" },
  });

  return (
    <div className="flex h-screen">
      <div className="flex w-80 shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="border-b border-slate-200 p-4">
          <SimulateMessageForm />
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 && (
            <p className="p-4 text-sm text-slate-500">
              No conversations yet. Simulate a customer message above.
            </p>
          )}
          {conversations.map((c) => {
            const last = c.messages[0];
            const extracted = last?.aiExtracted as { urgency?: string } | null;
            const urgent = extracted?.urgency === "urgent";
            return (
              <Link
                key={c.id}
                href={`/inbox/${c.id}`}
                className="block border-b border-slate-100 px-4 py-3 hover:bg-slate-50"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-900">
                    {urgent ? "🔴 " : c.status === "open" ? "🟡 " : "🟢 "}
                    {c.customer.name}
                  </p>
                  <span className="text-xs text-slate-400">
                    {timeAgo(c.lastMessageAt)}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-xs text-slate-500">
                  {last ? last.text : "No messages"}
                </p>
              </Link>
            );
          })}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
