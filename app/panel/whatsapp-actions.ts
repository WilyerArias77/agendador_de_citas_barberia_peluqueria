"use server";

import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireActiveOwner } from "../../lib/organization";
import { prisma } from "../../lib/prisma";
import { claimTrialNumber, isPaidPlan, removeConnection, whatsappNumberLimit } from "../../lib/whatsapp-access";
import { GraphError, encryptSecret, exchangeSignupCode, getPhoneNumber, isWhatsAppPlatformReady, listWabaPhones, registerPhone, subscribeAppToWaba } from "../../lib/whatsapp-cloud";

export type ConnectResult = { error?: string; success?: string };

const PAGE = "/panel/whatsapp";
const isMetaId = (value: unknown): value is string => typeof value === "string" && /^\d{5,25}$/.test(value);

function friendly(error: unknown) {
  if (error instanceof GraphError) return `Meta respondió: ${error.message}`;
  return "No pudimos completar la conexión. Intenta de nuevo en unos minutos.";
}

// Paso final del registro integrado de Meta (botón "Conectar tu número de WhatsApp Business").
// mode: "coexistence" si Meta conectó la app WhatsApp Business del celular; "cloud" si fue un número nuevo.
export async function connectWhatsApp(input: { code: string; wabaId: string; phoneNumberId?: string; mode: "coexistence" | "cloud" }): Promise<ConnectResult> {
  const { organization } = await requireActiveOwner();
  if (!isWhatsAppPlatformReady()) return { error: "La conexión con WhatsApp aún no está habilitada en la plataforma. Escríbenos a soporte." };
  if (typeof input?.code !== "string" || input.code.length < 10 || !isMetaId(input.wabaId) || (input.phoneNumberId && !isMetaId(input.phoneNumberId))) return { error: "Meta no devolvió los datos completos. Vuelve a intentarlo." };
  const mode = input.mode === "cloud" ? "cloud" : "coexistence";
  const paid = isPaidPlan(organization);
  const limit = whatsappNumberLimit(organization);

  try {
    const token = await exchangeSignupCode(input.code);
    // El token debe tener acceso real a la cuenta y al número (si Meta no dijo cuál, se toma el único o el primero libre).
    const phones = await listWabaPhones(input.wabaId, token);
    const phone = input.phoneNumberId ? phones.find((p) => p.id === input.phoneNumberId) : phones.find((p) => p.status !== "DISCONNECTED") ?? phones[0];
    if (!phone) return { error: "El número no pertenece a la cuenta de WhatsApp autorizada." };

    const existing = await prisma.whatsAppConnection.findUnique({ where: { phoneNumberId: phone.id } });
    if (existing && existing.organizationId !== organization.id) return { error: "Ese número ya está conectado a otro negocio de la plataforma." };
    if (!existing && (await prisma.whatsAppConnection.count({ where: { organizationId: organization.id } })) >= limit) {
      return { error: paid ? `Tu plan permite hasta ${limit} números de WhatsApp. Desconecta uno para conectar otro.` : "En la prueba gratis puedes conectar 1 número de WhatsApp. Activa tu plan para conectar más." };
    }
    const info = await getPhoneNumber(phone.id, token);
    const displayPhone = info.display_phone_number ?? phone.display_phone_number ?? "";
    if (!paid && !(await claimTrialNumber(organization.id, displayPhone))) return { error: "Este número de WhatsApp ya usó la prueba gratis en otro negocio. Activa tu plan para conectarlo." };

    await subscribeAppToWaba(input.wabaId, token);
    let pinEnc: string | null = existing?.pinEnc ?? null;
    // Número nuevo (solo API): se registra con un PIN de verificación en dos pasos. Si ya estaba registrado, se deja igual.
    if (mode === "cloud" && info.status !== "CONNECTED") {
      const pin = String(randomInt(100000, 1000000));
      try {
        await registerPhone(phone.id, token, pin);
        pinEnc = encryptSecret(pin);
      } catch (error) {
        if ((await getPhoneNumber(phone.id, token)).status !== "CONNECTED") throw error;
      }
    }
    const data = { organizationId: organization.id, wabaId: input.wabaId, displayPhone, verifiedName: info.verified_name ?? "", accessTokenEnc: encryptSecret(token), pinEnc, mode, status: "active", lastError: "" };
    await prisma.whatsAppConnection.upsert({ where: { phoneNumberId: phone.id }, create: { phoneNumberId: phone.id, ...data }, update: data });
  } catch (error) {
    console.error("[whatsapp] error conectando", error);
    return { error: friendly(error) };
  }
  revalidatePath(PAGE);
  return { success: "¡Listo! Tu número quedó conectado al Asistente de reservas. Escríbele desde otro celular para probarlo." };
}

export async function setWhatsAppAgentEnabled(connectionId: string, enabled: boolean) {
  const { organization } = await requireActiveOwner();
  await prisma.whatsAppConnection.updateMany({ where: { id: connectionId, organizationId: organization.id }, data: { agentEnabled: enabled } });
  revalidatePath(PAGE);
}

// Reactiva el asistente en todas las conversaciones que el dueño había tomado a mano.
export async function resumeAllConversations() {
  const { organization } = await requireActiveOwner();
  await prisma.whatsAppConversation.updateMany({ where: { organizationId: organization.id, botPausedUntil: { gt: new Date() } }, data: { botPausedUntil: null } });
  revalidatePath(PAGE);
}

export async function disconnectWhatsApp(connectionId: string) {
  const { organization } = await requireActiveOwner();
  const connection = await prisma.whatsAppConnection.findFirst({ where: { id: connectionId, organizationId: organization.id } });
  if (connection) await removeConnection(connection);
  revalidatePath(PAGE);
}
