import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { formatDateTime, formatINR } from "@/lib/format";
import { PageHeader, JobStatusBadge, EmptyState } from "@/components/ui";

export default async function JobsPage() {
  const session = await requireSession();

  const jobs = await prisma.job.findMany({
    where: { businessId: session.businessId },
    include: { customer: true, technician: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader title="Jobs" subtitle={`${jobs.length} total`} />
      <div className="p-8">
        {jobs.length === 0 ? (
          <EmptyState
            icon="🧰"
            title="No jobs yet"
            description="Create a job from a WhatsApp conversation in the Inbox."
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Service</th>
                  <th className="px-4 py-3">Technician</th>
                  <th className="px-4 py-3">Scheduled</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link href={`/jobs/${job.id}`} className="font-medium text-slate-900 hover:underline">
                        {job.customer.name}
                      </Link>
                      <p className="text-xs text-slate-500">{job.problem}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{job.serviceType}</td>
                    <td className="px-4 py-3 text-slate-700">{job.technician?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-700">{formatDateTime(job.scheduledAt)}</td>
                    <td className="px-4 py-3 text-slate-700">{formatINR(job.totalAmount)}</td>
                    <td className="px-4 py-3">
                      <JobStatusBadge status={job.status} />
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
