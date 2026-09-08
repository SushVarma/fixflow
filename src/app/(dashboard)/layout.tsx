import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();
  const business = await prisma.business.findUnique({
    where: { id: session.businessId },
  });

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar businessName={business?.name ?? ""} userName={session.name} />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
