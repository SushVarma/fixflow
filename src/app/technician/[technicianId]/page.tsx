import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatDateTime, formatINR } from "@/lib/format";
import { startJobAction, completeJobAction } from "@/lib/actions/jobs";

const FINDING_OPTIONS = ["Gas issue", "Compressor", "PCB", "Cleaning", "Drainage", "Other"];

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
function endOfToday() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

export default async function TechnicianPage({
  params,
}: {
  params: Promise<{ technicianId: string }>;
}) {
  const { technicianId } = await params;

  const technician = await prisma.technician.findUnique({ where: { id: technicianId } });
  if (!technician) notFound();

  const jobs = await prisma.job.findMany({
    where: {
      technicianId,
      status: { in: ["scheduled", "in_progress", "completed"] },
      OR: [
        { scheduledAt: { gte: startOfToday(), lte: endOfToday() } },
        { status: "in_progress" },
      ],
    },
    include: { customer: true },
    orderBy: { scheduledAt: "asc" },
  });

  return (
    <div className="mx-auto min-h-screen max-w-md bg-slate-50 pb-10">
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-4">
        <p className="text-xs text-slate-500">Today</p>
        <h1 className="text-lg font-semibold text-slate-900">{technician.name}</h1>
      </div>

      <div className="space-y-3 p-4">
        {jobs.length === 0 && (
          <p className="py-16 text-center text-sm text-slate-500">No jobs scheduled today.</p>
        )}

        {jobs.map((job) => (
          <div key={job.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900">
                {formatDateTime(job.scheduledAt)}
              </p>
              <StatusPill status={job.status} />
            </div>
            <p className="mt-1 text-sm text-slate-700">
              {job.customer.name} — {job.serviceType}
            </p>
            <p className="text-xs text-slate-500">📍 {job.address}</p>
            <p className="mt-1 text-xs text-slate-500">{job.problem}</p>

            {job.status === "scheduled" && (
              <form action={startJobAction} className="mt-3">
                <input type="hidden" name="jobId" value={job.id} />
                <button
                  type="submit"
                  className="w-full rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600"
                >
                  Start Job
                </button>
              </form>
            )}

            {job.status === "in_progress" && (
              <form action={completeJobAction} className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                <input type="hidden" name="jobId" value={job.id} />
                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    What did you find?
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {FINDING_OPTIONS.map((option) => (
                      <label key={option} className="flex items-center gap-1.5 text-sm text-slate-700">
                        <input type="checkbox" name="findings" value={option} className="rounded" />
                        {option}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Parts used
                  </p>
                  <div className="space-y-1.5">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="flex gap-2">
                        <input
                          name="partName"
                          placeholder="Part name"
                          className="flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                        />
                        <input
                          name="partCost"
                          type="number"
                          placeholder="₹ Cost"
                          className="w-24 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Labour charge (₹)
                  </label>
                  <input
                    name="laborCharge"
                    type="number"
                    defaultValue={0}
                    className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Complete Job
                </button>
              </form>
            )}

            {job.status === "completed" && (
              <p className="mt-3 text-sm font-medium text-emerald-600">
                ✓ Completed — {formatINR(job.totalAmount)}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    scheduled: "bg-amber-100 text-amber-700",
    in_progress: "bg-blue-100 text-blue-700",
    completed: "bg-emerald-100 text-emerald-700",
  };
  const labels: Record<string, string> = {
    scheduled: "Upcoming",
    in_progress: "In Progress",
    completed: "Done",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[status]}`}>
      {labels[status] ?? status}
    </span>
  );
}
