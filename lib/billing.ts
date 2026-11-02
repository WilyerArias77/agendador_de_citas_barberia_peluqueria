import type { Organization } from "@prisma/client";

// Suscripción por transferencia: el negocio paga a Nequi, reporta el pago y el administrador lo aprueba.

export const PLAN_NAME = "Plan Profesional";
export const PLAN_PRICE_IN_CENTS = 5_000_000; // $50.000 COP al mes
export const NEQUI_NUMBER = "3001284662";

export function supportWhatsapp() {
  return process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || NEQUI_NUMBER;
}

// Correos con acceso a /admin/pagos (variable PLATFORM_ADMIN_EMAILS, separados por coma).
export function isPlatformAdmin(email: string) {
  const admins = (process.env.PLATFORM_ADMIN_EMAILS ?? "").split(",").map((value) => value.trim().toLowerCase()).filter(Boolean);
  return admins.includes(email.toLowerCase());
}

// Un mes más contado desde lo que esté más lejos: hoy, el fin de la prueba o el fin del periodo pagado.
export function nextPeriodEnd(org: Pick<Organization, "trialEndsAt" | "currentPeriodEnd">, now = new Date()) {
  const start = new Date(Math.max(now.getTime(), org.trialEndsAt?.getTime() ?? 0, org.currentPeriodEnd?.getTime() ?? 0));
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);
  return end;
}
