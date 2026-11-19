"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOwnerOrganization } from "../../lib/organization";
import { prisma } from "../../lib/prisma";
import { isSetupStepKey } from "../../lib/setup-steps";

// Marca (o desmarca) un paso de la guía como cumplido y lleva al dueño a la lista de pasos pendientes.
export async function completeSetupStep(formData: FormData) {
  const { organization } = await requireOwnerOrganization();
  const key = formData.get("step");
  if (!isSetupStepKey(key)) return;
  const done = formData.get("done") === "on";
  const current = new Set(organization.setupCompleted);
  if (done) current.add(key);
  else current.delete(key);
  await prisma.organization.update({ where: { id: organization.id }, data: { setupCompleted: Array.from(current) } });
  revalidatePath("/panel");
  if (done) redirect("/panel#guia");
}
