"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

export async function addTechnicianAction(formData: FormData) {
  const session = await requireSession();
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  if (!name || !phone) return;

  await prisma.technician.create({
    data: { businessId: session.businessId, name, phone },
  });

  revalidatePath("/settings");
}

export async function toggleTechnicianAvailabilityAction(formData: FormData) {
  await requireSession();
  const technicianId = String(formData.get("technicianId") ?? "");
  const technician = await prisma.technician.findUnique({ where: { id: technicianId } });
  if (!technician) return;

  await prisma.technician.update({
    where: { id: technicianId },
    data: { available: !technician.available },
  });

  revalidatePath("/settings");
}
