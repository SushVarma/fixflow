import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { PageHeader } from "@/components/ui";
import { addTechnicianAction, toggleTechnicianAvailabilityAction } from "@/lib/actions/technicians";

export default async function SettingsPage() {
  const session = await requireSession();

  const [business, technicians] = await Promise.all([
    prisma.business.findUnique({ where: { id: session.businessId } }),
    prisma.technician.findMany({
      where: { businessId: session.businessId },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-8">
      <PageHeader title="Settings" />

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Business</h2>
        <div className="space-y-1 text-sm">
          <p>
            <span className="text-slate-500">Name: </span>
            {business?.name}
          </p>
          <p>
            <span className="text-slate-500">WhatsApp number: </span>
            {business?.whatsappNumber}
          </p>
          <p>
            <span className="text-slate-500">Service types: </span>
            {business?.serviceTypes.join(", ")}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Technicians</h2>
        <div className="space-y-2">
          {technicians.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2"
            >
              <div>
                <p className="text-sm font-medium text-slate-900">{t.name}</p>
                <p className="text-xs text-slate-500">{t.phone}</p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/technician/${t.id}`}
                  className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50"
                >
                  Open mobile view
                </Link>
                <form action={toggleTechnicianAvailabilityAction}>
                  <input type="hidden" name="technicianId" value={t.id} />
                  <button
                    type="submit"
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                      t.available
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {t.available ? "Available" : "Unavailable"}
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>

        <form action={addTechnicianAction} className="mt-4 flex gap-2 border-t border-slate-100 pt-4">
          <input
            name="name"
            placeholder="Technician name"
            required
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            name="phone"
            placeholder="Phone"
            required
            className="w-36 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Add
          </button>
        </form>
      </div>
    </div>
  );
}
