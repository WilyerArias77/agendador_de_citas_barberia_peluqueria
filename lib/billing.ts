import type { Organization } from "@prisma/client";
import { prisma } from "./prisma";

// Suscripción por transferencia: el negocio paga a Nequi, reporta el pago y el administrador lo aprueba.
// Tarifa: pago único de instalación según el número de barberos + mensualidad por barbero.

export const PLAN_NAME = "Plan Profesional";
export const MONTHLY_PER_BARBER_IN_CENTS = 5_000_000; // $50.000 COP al mes por barbero
export const NEQUI_NUMBER = "3001284662";

export const PLAN_TIERS = [
  { label: "1 barbero", setupInCents: 30_000_000 },
  { label: "2 barberos", setupInCents: 40_000_000 },
  { label: "Más de 2 barberos", setupInCents: 50_000_000 }
] as const;

export function setupFeeInCents(barbers: number) {
  return PLAN_TIERS[barbers <= 1 ? 0 : barbers === 2 ? 1 : 2].setupInCents;
}

// Barberos que se cobran: los activos; un negocio sin barberos registrados cuenta como 1.
export async function billableBarbers(organizationId: string) {
  return Math.max(1, await prisma.barber.count({ where: { organizationId, active: true } }));
}

// Lo que se paga ahora: la instalación (solo la primera vez) + un mes por cada barbero.
export async function amountDue(org: Pick<Organization, "id" | "setupPaidAt">) {
  const barbers = await billableBarbers(org.id);
  const setupInCents = org.setupPaidAt ? 0 : setupFeeInCents(barbers);
  const monthlyInCents = MONTHLY_PER_BARBER_IN_CENTS * barbers;
  return { barbers, setupInCents, monthlyInCents, totalInCents: setupInCents + monthlyInCents };
}

export function supportWhatsapp() {
  return process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || NEQUI_NUMBER;
}

// Correos con acceso a /admin/pagos (variable PLATFORM_ADMIN_EMAILS, separados por coma).
export function isPlatformAdmin(email: string) {
  const admins = (process.env.PLATFORM_ADMIN_EMAILS ?? "").split(",").map((value) => value.trim().toLowerCase()).filter(Boolean);
  return admins.includes(email.toLowerCase());
}

// Protección extra: además de estar en la lista, el correo debe estar confirmado.
// Así nadie puede registrarse con un correo de administrador que aún no tenga cuenta y entrar al panel de pagos.
export function isVerifiedPlatformAdmin(user: { email: string; emailVerified: boolean }) {
  return user.emailVerified && isPlatformAdmin(user.email);
}

// Un mes más contado desde lo que esté más lejos: hoy, el fin de la prueba o el fin del periodo pagado.
export function nextPeriodEnd(org: Pick<Organization, "trialEndsAt" | "currentPeriodEnd">, now = new Date()) {
  const start = new Date(Math.max(now.getTime(), org.trialEndsAt?.getTime() ?? 0, org.currentPeriodEnd?.getTime() ?? 0));
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);
  return end;
}
