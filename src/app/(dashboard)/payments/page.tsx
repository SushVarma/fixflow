import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { formatINR, formatDateTime } from "@/lib/format";
import { PageHeader, PaymentStatusBadge, StatCard, EmptyState } from "@/components/ui";
import { markPaidAction } from "@/lib/actions/payments";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export default async function PaymentsPage() {
  const session = await requireSession();
  const todayStart = startOfToday();

  const payments = await prisma.payment.findMany({
    where: { businessId: session.businessId },
    include: { job: { include: { customer: true } } },
    orderBy: { requestedAt: "desc" },
  });

  const collectedToday = payments
    .filter((p) => p.status === "paid" && p.paidAt && p.paidAt >= todayStart)
    .reduce((sum, p) => sum + p.amount, 0);
  const pending = payments.filter((p) => p.status === "pending").reduce((sum, p) => sum + p.amount, 0);
  const overdue = payments.filter((p) => p.status === "overdue").reduce((sum, p) => sum + p.amount, 0);

  return (
    <div>
      <PageHeader title="Payments" />
      <div className="space-y-6 p-8">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <StatCard label="Collected Today" value={formatINR(collectedToday)} tone="success" />
          <StatCard label="Pending" value={formatINR(pending)} tone={pending > 0 ? "danger" : "default"} />
          <StatCard label="Overdue" value={formatINR(overdue)} tone={overdue > 0 ? "danger" : "default"} />
        </div>

        {payments.length === 0 ? (
          <EmptyState icon="₹" title="No payments yet" />
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Requested</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 font-medium text-slate-900">{p.job.customer.name}</td>
                    <td className="px-4 py-3 text-slate-700">{formatINR(p.amount)}</td>
                    <td className="px-4 py-3 text-slate-500">{formatDateTime(p.requestedAt)}</td>
                    <td className="px-4 py-3">
                      <PaymentStatusBadge status={p.status} />
                    </td>
                    <td className="px-4 py-3">
                      {p.status !== "paid" && (
                        <form action={markPaidAction} className="flex items-center gap-2">
                          <input type="hidden" name="paymentId" value={p.id} />
                          <select
                            name="method"
                            className="rounded-lg border border-slate-300 px-2 py-1 text-xs"
                          >
                            <option value="upi">UPI</option>
                            <option value="cash">Cash</option>
                            <option value="card">Card</option>
                          </select>
                          <button
                            type="submit"
                            className="rounded-lg bg-emerald-500 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-600"
                          >
                            Mark Paid
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
