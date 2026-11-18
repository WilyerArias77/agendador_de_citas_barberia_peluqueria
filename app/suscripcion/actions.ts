"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { activateOneMonth } from "../../lib/billing";
import { requireOrganization } from "../../lib/organization";
import { prisma } from "../../lib/prisma";
import { isRateLimited } from "../../lib/rate-limit";
import type { ActionState } from "../panel/actions";

// El negocio ingresa el código de aprobación de 5 dígitos que le envió el dueño de la plataforma.
// No exige plan vigente: es justo la vía para activarlo.
export async function redeemApprovalCode(_state: ActionState, formData: FormData): Promise<ActionState> {
  const { organization, isOwner } = await requireOrganization();
  if (!isOwner) redirect("/panel");
  const code = String(formData.get("code") ?? "").replace(/\D/g, "");
  if (code.length !== 5) return { error: "El código de aprobación tiene 5 dígitos." };
  // Contra intentos al azar: máximo 5 intentos por hora por negocio.
  if (await isRateLimited(`approval-code:${organization.id}`, 5, 3600)) return { error: "Demasiados intentos. Espera una hora o escríbenos por WhatsApp." };
  const report = await prisma.paymentReport.findFirst({ where: { organizationId: organization.id, status: "code_sent", approvalCode: code, codeExpiresAt: { gt: new Date() } } });
  if (!report) return { error: "El código no es válido o ya venció. Revísalo o pídenos uno nuevo por WhatsApp." };
  // Un código solo se usa una vez, aunque se envíe dos veces el formulario.
  const claimed = await prisma.paymentReport.updateMany({ where: { id: report.id, status: "code_sent" }, data: { status: "approved", reviewedAt: new Date() } });
  if (claimed.count === 1) await activateOneMonth(organization.id, report.setupInCents > 0);
  revalidatePath("/", "layout");
  return { success: "¡Bienvenido! Tu plan quedó activo. De ahora en adelante puedes usar la aplicación." };
}
