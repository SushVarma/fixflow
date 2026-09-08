import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function TechnicianPickerPage() {
  const technicians = await prisma.technician.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-3 p-6">
      <h1 className="mb-2 text-center text-lg font-semibold text-slate-900">
        Who&apos;s working today?
      </h1>
      {technicians.map((t) => (
        <Link
          key={t.id}
          href={`/technician/${t.id}`}
          className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-center font-medium text-slate-800 shadow-sm hover:border-emerald-300"
        >
          {t.name}
        </Link>
      ))}
    </div>
  );
}
