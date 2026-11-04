"use server";

import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { isVerifiedPlatformAdmin, nextPeriodEnd } from "../../lib/billing";
import { requireSession } from "../../lib/organization";
import { prisma } from "../../lib/prisma";

async function requireAdmin() {
  const session = await requireSession();
  if (!isVerifiedPlatformAdmin(session.user)) notFound();
  return session;
}

async function extendOneMonth(organizationId: string, setupPaid = false) {
  const organization = await prisma.organization.findUniqueOrThrow({ where: { id: organizationId } });
  await prisma.organization.update({ where: { id: organizationId }, data: { subscriptionStatus: "active", currentPeriodEnd: nextPeriodEnd(organization), ...(setupPaid && !organization.setupPaidAt ? { setupPaidAt: new Date() } : {}) } });
}

export async function approvePayment(reportId: string) {
  await requireAdmin();
  // Solo un aprobado por reporte, aunque se haga doble clic.
  const report = await prisma.paymentReport.findUnique({ where: { id: reportId } });
  const claimed = await prisma.paymentReport.updateMany({ where: { id: reportId, status: "pending" }, data: { status: "approved", reviewedAt: new Date() } });
  if (report && claimed.count === 1) await extendOneMonth(report.organizationId, report.setupInCents > 0);
  revalidatePath("/admin/pagos");
}

export async function rejectPayment(reportId: string) {
  await requireAdmin();
  await prisma.paymentReport.updateMany({ where: { id: reportId, status: "pending" }, data: { status: "rejected", reviewedAt: new Date() } });
  revalidatePath("/admin/pagos");
}

// Para pagos recibidos sin reporte en la app (p. ej. solo por WhatsApp).
export async function activateManually(organizationId: string) {
  await requireAdmin();
  await extendOneMonth(organizationId);
  revalidatePath("/admin/pagos");
}

// Instalación pagada por fuera de un reporte (p. ej. por WhatsApp).
export async function markSetupPaid(organizationId: string) {
  await requireAdmin();
  await prisma.organization.updateMany({ where: { id: organizationId, setupPaidAt: null }, data: { setupPaidAt: new Date() } });
  revalidatePath("/admin/pagos");
}
