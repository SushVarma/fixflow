import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { formatINR, formatDate } from "@/lib/format";
import { PageHeader, EmptyState } from "@/components/ui";

export default async function CustomersPage() {
  const session = await requireSession();

  const customers = await prisma.customer.findMany({
    where: { businessId: session.businessId },
    include: { jobs: { include: { payments: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader title="Customers" subtitle={`${customers.length} total`} />
      <div className="p-8">
        {customers.length === 0 ? (
          <EmptyState icon="👥" title="No customers yet" />
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {customers.map((c) => {
              const lifetime = c.jobs
                .flatMap((j) => j.payments)
                .filter((p) => p.status === "paid")
                .reduce((sum, p) => sum + p.amount, 0);
              const lastJob = c.jobs[0];
              return (
                <Link
                  key={c.id}
                  href={`/customers/${c.id}`}
                  className="rounded-xl border border-slate-200 bg-white p-4 hover:border-emerald-300 hover:shadow-sm"
                >
                  <p className="font-medium text-slate-900">{c.name}</p>
                  <p className="text-xs text-slate-500">{c.phone}</p>
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-slate-600">{c.jobs.length} job{c.jobs.length === 1 ? "" : "s"}</span>
                    <span className="font-medium text-slate-900">{formatINR(lifetime)}</span>
                  </div>
                  {lastJob && (
                    <p className="mt-1 text-xs text-slate-400">
                      Last: {formatDate(lastJob.createdAt)}
                    </p>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
