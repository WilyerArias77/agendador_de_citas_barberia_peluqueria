import type { Organization, WhatsAppConnection } from "@prisma/client";
import { prisma } from "./prisma";
import { decryptSecret, unsubscribeAppFromWaba } from "./whatsapp-cloud";

// Reglas de cuántos números de WhatsApp puede conectar cada negocio al Asistente de reservas.
// Prueba gratis: 1 número, y se desconecta solo cuando la prueba termina. Plan pagado: hasta 3.

export const WHATSAPP_NUMBERS_TRIAL = 1;
export const WHATSAPP_NUMBERS_PAID = 3;

type OrgPlan = Pick<Organization, "subscriptionStatus" | "trialEndsAt">;

export function isPaidPlan(org: Pick<Organization, "subscriptionStatus">) {
  return org.subscriptionStatus === "active";
}

export function trialExpired(org: OrgPlan, now = Date.now()) {
  return org.subscriptionStatus === "trialing" && (!org.trialEndsAt || org.trialEndsAt.getTime() <= now);
}

export function whatsappNumberLimit(org: OrgPlan, isPlatformAdmin = false) {
  return isPaidPlan(org) || isPlatformAdmin ? WHATSAPP_NUMBERS_PAID : WHATSAPP_NUMBERS_TRIAL;
}

// Últimos 10 dígitos: así "+57 300 123 4567" y "3001234567" cuentan como el mismo número.
export const phoneKey = (value: string) => value.replace(/\D/g, "").slice(-10);

// La prueba gratis es una por número de WhatsApp: si ese número ya se conectó en la prueba de otro negocio, no vuelve a tener prueba.
export async function claimTrialNumber(organizationId: string, phone: string) {
  const value = phoneKey(phone);
  if (value.length < 7) return true;
  const existing = await prisma.trialFingerprint.findUnique({ where: { kind_value: { kind: "whatsapp", value } } });
  if (existing) return existing.organizationId === organizationId;
  await prisma.trialFingerprint.create({ data: { kind: "whatsapp", value, organizationId } }).catch(() => undefined);
  return true;
}

export async function trialNumberUsedElsewhere(phone: string) {
  const value = phoneKey(phone);
  if (value.length < 7) return false;
  return !!(await prisma.trialFingerprint.findUnique({ where: { kind_value: { kind: "whatsapp", value } } }));
}

// Quita el número de la plataforma. Solo se retira la suscripción de la app en Meta si ningún otro número usa esa cuenta (WABA).
export async function removeConnection(connection: WhatsAppConnection) {
  const sharing = await prisma.whatsAppConnection.count({ where: { wabaId: connection.wabaId, id: { not: connection.id } } });
  if (!sharing) {
    try {
      await unsubscribeAppFromWaba(connection.wabaId, decryptSecret(connection.accessTokenEnc));
    } catch (error) {
      console.error("[whatsapp] no se pudo quitar la suscripción en Meta", error);
    }
  }
  await prisma.whatsAppConnection.deleteMany({ where: { id: connection.id } });
}

// Desconecta los números de los negocios cuya prueba gratis ya terminó sin pagar el plan.
export async function disconnectExpiredTrials() {
  const connections = await prisma.whatsAppConnection.findMany({ where: { organization: { subscriptionStatus: "trialing", OR: [{ trialEndsAt: null }, { trialEndsAt: { lte: new Date() } }] } } });
  for (const connection of connections) await removeConnection(connection);
  return connections.length;
}
