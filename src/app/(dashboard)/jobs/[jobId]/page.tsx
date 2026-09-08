import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { formatDate, formatDateTime, formatINR } from "@/lib/format";
import { JobStatusBadge, PaymentStatusBadge } from "@/components/ui";
import { assignTechnicianAction, rescheduleJobAction } from "@/lib/actions/jobs";

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  const session = await requireSession();

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: {
      customer: true,
      technician: true,
      events: { orderBy: { createdAt: "desc" } },
      payments: true,
      warranty: true,
    },
  });
  if (!job || job.businessId !== session.businessId) notFound();

  const [technicians, customerHistory] = await Promise.all([
    prisma.technician.findMany({ where: { businessId: session.businessId, available: true } }),
    prisma.job.findMany({
      where: { customerId: job.customerId, id: { not: job.id } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const scheduledAtLocal = job.scheduledAt
    ? new Date(job.scheduledAt.getTime() - job.scheduledAt.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16)
    : "";

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Job #{job.id.slice(-6)}
          </p>
          <h1 className="text-xl font-semibold text-slate-900">{job.customer.name}</h1>
        </div>
        <JobStatusBadge status={job.status} />
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-xl border border-slate-200 bg-white p-5 text-sm">
        <Field label="Service">{job.serviceType}</Field>
        <Field label="Problem">{job.problem}</Field>
        <Field label="Address">{job.address}</Field>
        <Field label="Technician">{job.technician?.name ?? "Unassigned"}</Field>
        <Field label="Appointment">{formatDateTime(job.scheduledAt)}</Field>
        <Field label="Estimated value">
          {job.estimatedMin != null ? `₹${job.estimatedMin}–₹${job.estimatedMax}` : "—"}
        </Field>
      </div>

      {job.status !== "completed" && job.status !== "cancelled" && (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">
            {job.technicianId ? "Reschedule" : "Assign Technician"}
          </h2>
          <form
            action={job.technicianId ? rescheduleJobAction : assignTechnicianAction}
            className="flex flex-wrap items-end gap-3"
          >
            <input type="hidden" name="jobId" value={job.id} />
            {!job.technicianId && (
              <div>
                <label className="mb-1 block text-xs text-slate-500">Technician</label>
                <select
                  name="technicianId"
                  required
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  {technicians.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="mb-1 block text-xs text-slate-500">Date & time</label>
              <input
                type="datetime-local"
                name="scheduledAt"
                required
                defaultValue={scheduledAtLocal}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
            >
              {job.technicianId ? "Reschedule" : "Assign & Notify Customer"}
            </button>
          </form>
        </div>
      )}

      {job.status === "scheduled" || job.status === "in_progress" ? (
        <p className="text-sm text-slate-500">
          Technicians complete jobs from their{" "}
          {job.technicianId ? (
            <Link href={`/technician/${job.technicianId}`} className="text-emerald-600 hover:underline">
              mobile job view
            </Link>
          ) : (
            "mobile job view"
          )}
          .
        </p>
      ) : null}

      {job.findings.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-2 text-sm font-semibold text-slate-700">What technician found</h2>
          <div className="flex flex-wrap gap-2">
            {job.findings.map((f) => (
              <span key={f} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
                {f}
              </span>
            ))}
          </div>
        </div>
      )}

      {job.payments.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-2 text-sm font-semibold text-slate-700">Payment</h2>
          {job.payments.map((p) => (
            <div key={p.id} className="flex items-center justify-between">
              <span className="text-lg font-semibold">{formatINR(p.amount)}</span>
              <PaymentStatusBadge status={p.status} />
            </div>
          ))}
          {job.warranty && (
            <p className="mt-2 text-xs text-slate-500">
              Warranty until {formatDate(job.warranty.expiresAt)}
            </p>
          )}
        </div>
      )}

      {customerHistory.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-2 text-sm font-semibold text-slate-700">Customer history</h2>
          <div className="space-y-1">
            {customerHistory.map((h) => (
              <Link
                key={h.id}
                href={`/jobs/${h.id}`}
                className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50"
              >
                <span className="text-slate-700">
                  {formatDate(h.createdAt)} — {h.serviceType}
                </span>
                <span className="text-slate-500">{formatINR(h.totalAmount)}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-2 text-sm font-semibold text-slate-700">Timeline</h2>
        <div className="space-y-2">
          {job.events.map((e) => (
            <div key={e.id} className="flex items-center justify-between text-sm">
              <span className="capitalize text-slate-700">{e.type.replace(/_/g, " ")}</span>
              <span className="text-xs text-slate-400">{formatDateTime(e.createdAt)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="font-medium text-slate-900">{children}</p>
    </div>
  );
}
