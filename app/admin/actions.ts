"use server";

import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { APPROVAL_CODE_DAYS, activateOneMonth, amountDue, isVerifiedPlatformAdmin } from "../../lib/billing";
import { requireSession } from "../../lib/organization";
import { prisma } from "../../lib/prisma";
import { isOwnerUnlocked } from "../../lib/owner-key";

async function requireAdmin() {
  const session = await requireSession();
  if (!isVerifiedPlatformAdmin(session.user) || !(await isOwnerUnlocked(session.user.id))) notFound();
  return session;
}

export async function approvePayment(reportId: string) {
  await requireAdmin();
  // Solo un aprobado por reporte, aunque se haga doble clic.
  const report = await prisma.paymentReport.findUnique({ where: { id: reportId } });
  const claimed = await prisma.paymentReport.updateMany({ where: { id: reportId, status: "pending" }, data: { status: "approved", reviewedAt: new Date() } });
  if (report && claimed.count === 1) await activateOneMonth(report.organizationId, report.setupInCents > 0);
  revalidatePath("/admin/pagos");
}

export async function rejectPayment(reportId: string) {
  await requireAdmin();
  await prisma.paymentReport.updateMany({ where: { id: reportId, status: "pending" }, data: { status: "rejected", reviewedAt: new Date() } });
  revalidatePath("/admin/pagos");
}

// Pago confirmado en Nequi: genera el código de 5 dígitos que el dueño le envía al negocio por WhatsApp.
// Un solo código vigente por negocio; generar uno nuevo anula el anterior.
export async function generateApprovalCode(organizationId: string) {
  await requireAdmin();
  const organization = await prisma.organization.findUnique({ where: { id: organizationId } });
  if (!organization) return;
  const due = await amountDue(organization);
  await prisma.paymentReport.updateMany({ where: { organizationId, status: "code_sent" }, data: { status: "cancelled", reviewedAt: new Date() } });
  await prisma.paymentReport.create({
    data: { organizationId, amountInCents: due.totalInCents, setupInCents: due.setupInCents, barbers: due.barbers, reference: "Código de aprobación", payerName: "", status: "code_sent", approvalCode: String(randomInt(10000, 100000)), codeExpiresAt: new Date(Date.now() + APPROVAL_CODE_DAYS * 86_400_000) }
  });
  revalidatePath("/admin/pagos");
}

export async function cancelApprovalCode(reportId: string) {
  await requireAdmin();
  await prisma.paymentReport.updateMany({ where: { id: reportId, status: "code_sent" }, data: { status: "cancelled", reviewedAt: new Date() } });
  revalidatePath("/admin/pagos");
}

// Para pagos recibidos sin reporte en la app (p. ej. solo por WhatsApp).
export async function activateManually(organizationId: string) {
  await requireAdmin();
  await activateOneMonth(organizationId);
  revalidatePath("/admin/pagos");
}

// Instalación pagada por fuera de un reporte (p. ej. por WhatsApp).
export async function markSetupPaid(organizationId: string) {
  await requireAdmin();
  await prisma.organization.updateMany({ where: { id: organizationId, setupPaidAt: null }, data: { setupPaidAt: new Date() } });
  revalidatePath("/admin/pagos");
}

// ---------- Soporte del asistente de WhatsApp ----------

export async function setConnectionAgent(connectionId: string, enabled: boolean) {
  await requireAdmin();
  await prisma.whatsAppConnection.update({ where: { id: connectionId }, data: { agentEnabled: enabled } });
  revalidatePath("/admin/whatsapp");
}

// Tras corregir un problema (p. ej. permisos en Meta), vuelve a intentar con el mismo token.
export async function resetConnectionError(connectionId: string) {
  await requireAdmin();
  await prisma.whatsAppConnection.update({ where: { id: connectionId }, data: { status: "active", lastError: "" } });
  revalidatePath("/admin/whatsapp");
}
