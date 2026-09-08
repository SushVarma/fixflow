import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { formatINR, formatDateTime } from "@/lib/format";
import { StatCard, PageHeader, EmptyState } from "@/components/ui";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export default async function DashboardPage() {
  const session = await requireSession();
  const businessId = session.businessId;
  const todayStart = startOfToday();

  const [todaysJobs, paidToday, pendingPayments, delayedJobs, expiringWarranties] =
    await Promise.all([
      prisma.job.findMany({
        where: {
          businessId,
          OR: [
            { scheduledAt: { gte: todayStart } },
            { createdAt: { gte: todayStart } },
          ],
        },
        include: { customer: true, technician: true },
      }),
      prisma.payment.findMany({
        where: { businessId, status: "paid", paidAt: { gte: todayStart } },
      }),
      prisma.payment.findMany({
        where: { businessId, status: { in: ["pending", "overdue"] } },
        include: { job: { include: { customer: true } } },
        orderBy: { requestedAt: "desc" },
      }),
      prisma.job.findMany({
        where: {
          businessId,
          status: "scheduled",
          scheduledAt: { lt: new Date(Date.now() - 45 * 60 * 1000) },
        },
        include: { customer: true, technician: true },
      }),
      prisma.warranty.findMany({
        where: {
          job: { businessId },
          expiresAt: {
            gte: new Date(),
            lte: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
          },
        },
        include: { job: { include: { customer: true } } },
      }),
    ]);

  const completed = todaysJobs.filter((j) => j.status === "completed").length;
  const inProgress = todaysJobs.filter((j) => j.status === "in_progress").length;
  const unassigned = todaysJobs.filter((j) => j.status === "unassigned").length;

  const todaysRevenue = paidToday.reduce((sum, p) => sum + p.amount, 0);
  const pendingTotal = pendingPayments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div>
      <PageHeader title={`Good ${greeting()} 👋`} subtitle={`${todaysJobs.length} jobs today`} />

      <div className="space-y-8 p-8">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          <StatCard label="Today's Jobs" value={String(todaysJobs.length)} />
          <StatCard label="Completed" value={String(completed)} tone="success" />
          <StatCard label="In Progress" value={String(inProgress)} />
          <StatCard label="Unassigned" value={String(unassigned)} tone={unassigned > 0 ? "danger" : "default"} />
          <StatCard label="Delayed" value={String(delayedJobs.length)} tone={delayedJobs.length > 0 ? "danger" : "default"} />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <StatCard label="Today's Revenue" value={formatINR(todaysRevenue)} tone="success" />
          <StatCard label="Pending Payments" value={formatINR(pendingTotal)} tone={pendingTotal > 0 ? "danger" : "default"} />
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Attention Required
          </h2>

          {delayedJobs.length === 0 && pendingPayments.length === 0 && expiringWarranties.length === 0 ? (
            <EmptyState icon="✅" title="Nothing needs attention right now" />
          ) : (
            <div className="space-y-2">
              {delayedJobs.map((job) => (
                <Link
                  key={job.id}
                  href={`/jobs/${job.id}`}
                  className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 hover:bg-red-100"
                >
                  <div>
                    <p className="text-sm font-medium text-red-800">
                      🔴 Job for {job.customer.name} is delayed
                    </p>
                    <p className="text-xs text-red-600">
                      Scheduled {formatDateTime(job.scheduledAt)} — technician hasn&apos;t started
                    </p>
                  </div>
                </Link>
              ))}

              {pendingPayments.slice(0, 5).map((payment) => (
                <Link
                  key={payment.id}
                  href="/payments"
                  className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 hover:bg-amber-100"
                >
                  <div>
                    <p className="text-sm font-medium text-amber-800">
                      🟠 {formatINR(payment.amount)} pending from {payment.job.customer.name}
                    </p>
                    <p className="text-xs text-amber-600">
                      Requested {formatDateTime(payment.requestedAt)}
                    </p>
                  </div>
                </Link>
              ))}

              {expiringWarranties.map((w) => (
                <Link
                  key={w.id}
                  href={`/customers/${w.job.customerId}`}
                  className="flex items-center justify-between rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 hover:bg-orange-100"
                >
                  <div>
                    <p className="text-sm font-medium text-orange-800">
                      🟠 Warranty expiring for {w.job.customer.name}
                    </p>
                    <p className="text-xs text-orange-600">
                      Expires {formatDateTime(w.expiresAt)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}
