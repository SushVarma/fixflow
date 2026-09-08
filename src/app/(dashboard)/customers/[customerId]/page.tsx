import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { formatDate, formatINR } from "@/lib/format";
import { JobStatusBadge } from "@/components/ui";
import { sendFollowUpAction } from "@/lib/actions/messages";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ customerId: string }>;
}) {
  const { customerId } = await params;
  const session = await requireSession();

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: {
      jobs: {
        include: { payments: true, warranty: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!customer || customer.businessId !== session.businessId) notFound();

  const lifetime = customer.jobs
    .flatMap((j) => j.payments)
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + p.amount, 0);

  const lastCompleted = customer.jobs.find((j) => j.status === "completed");
  const activeWarranty = customer.jobs
    .map((j) => j.warranty)
    .find((w) => w && w.expiresAt > new Date());

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{customer.name}</h1>
          <p className="text-sm text-slate-500">📱 {customer.phone}</p>
          {customer.address && <p className="text-sm text-slate-500">📍 {customer.address}</p>}
        </div>
        <form action={sendFollowUpAction}>
          <input type="hidden" name="customerId" value={customer.id} />
          <button
            type="submit"
            className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
          >
            Send Follow-up
          </button>
        </form>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <MiniStat label="Total Jobs" value={String(customer.jobs.length)} />
        <MiniStat label="Total Revenue" value={formatINR(lifetime)} />
        <MiniStat label="Last Service" value={lastCompleted ? formatDate(lastCompleted.completedAt) : "—"} />
        <MiniStat
          label="Warranty"
          value={activeWarranty ? `Until ${formatDate(activeWarranty.expiresAt)}` : "—"}
        />
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Job history
        </h2>
        <div className="space-y-2">
          {customer.jobs.map((job) => (
            <Link
              key={job.id}
              href={`/jobs/${job.id}`}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 hover:border-emerald-300"
            >
              <div>
                <p className="text-sm font-medium text-slate-900">{job.serviceType}</p>
                <p className="text-xs text-slate-500">{formatDate(job.createdAt)}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-700">{formatINR(job.totalAmount)}</span>
                <JobStatusBadge status={job.status} />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}
