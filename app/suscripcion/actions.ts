"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { amountDue } from "../../lib/billing";
import { requireOrganization } from "../../lib/organization";
import { prisma } from "../../lib/prisma";
import type { ActionState } from "../panel/actions";

// No exige plan vigente: es justo la vía para reactivarlo.
export async function reportPayment(_state: ActionState, formData: FormData): Promise<ActionState> {
  const { organization, isOwner } = await requireOrganization();
  if (!isOwner) redirect("/panel");
  const reference = String(formData.get("reference") ?? "").trim().slice(0, 60);
  const payerName = String(formData.get("payerName") ?? "").trim().slice(0, 80);
  if (payerName.length < 2) return { error: "Escribe el nombre de quien hizo la transferencia." };
  if (reference.length < 4) return { error: "Escribe la referencia o número de la transferencia que aparece en Nequi." };
  if (await prisma.paymentReport.count({ where: { organizationId: organization.id, status: "pending" } })) return { error: "Ya tienes un pago en revisión. Te avisaremos cuando lo confirmemos." };
  const due = await amountDue(organization);
  await prisma.paymentReport.create({ data: { organizationId: organization.id, amountInCents: due.totalInCents, setupInCents: due.setupInCents, barbers: due.barbers, reference, payerName } });
  revalidatePath("/suscripcion");
  return { success: "¡Recibimos tu reporte! Revisaremos la transferencia y activaremos tu plan. Envíanos el comprobante por WhatsApp para agilizarlo." };
}
