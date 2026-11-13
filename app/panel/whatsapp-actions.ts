"use server";

import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { isVerifiedPlatformAdmin } from "../../lib/billing";
import { requireActiveOwner } from "../../lib/organization";
import { prisma } from "../../lib/prisma";
import { GraphError, decryptSecret, encryptSecret, exchangeSignupCode, getPhoneNumber, isWhatsAppPlatformReady, registerPhone, subscribeAppToWaba, unsubscribeAppFromWaba, wabaOwnsPhone } from "../../lib/whatsapp-cloud";

export type ConnectResult = { error?: string; success?: string };

const isMetaId = (value: unknown): value is string => typeof value === "string" && /^\d{5,25}$/.test(value);

// El asistente de WhatsApp es parte del plan mensual pagado (los administradores pueden probarlo siempre).
async function requireAssistantOwner() {
  const context = await requireActiveOwner();
  const allowed = context.organization.subscriptionStatus === "active" || isVerifiedPlatformAdmin(context.session.user);
  return { ...context, allowed };
}

function friendly(error: unknown) {
  if (error instanceof GraphError) return `Meta respondió: ${error.message}`;
  return "No pudimos completar la conexión. Intenta de nuevo en unos minutos.";
}

// Paso final del registro integrado de Meta (botón "Conectar mi WhatsApp").
export async function connectWhatsApp(input: { code: string; wabaId: string; phoneNumberId: string; mode: "coexistence" | "cloud" }): Promise<ConnectResult> {
  const { organization, allowed } = await requireAssistantOwner();
  if (!allowed) return { error: "El asistente de WhatsApp está disponible con el plan mensual activo." };
  if (!isWhatsAppPlatformReady()) return { error: "La conexión con WhatsApp aún no está habilitada en la plataforma. Escríbenos a soporte." };
  if (typeof input?.code !== "string" || input.code.length < 10 || !isMetaId(input.wabaId) || !isMetaId(input.phoneNumberId)) return { error: "Meta no devolvió los datos completos. Vuelve a intentarlo." };
  const mode = input.mode === "cloud" ? "cloud" : "coexistence";

  const taken = await prisma.whatsAppConnection.findUnique({ where: { phoneNumberId: input.phoneNumberId } });
  if (taken && taken.organizationId !== organization.id) return { error: "Ese número ya está conectado a otro negocio de la plataforma." };

  try {
    const token = await exchangeSignupCode(input.code);
    // El token debe tener acceso real a la cuenta y al número que dice el navegador.
    if (!(await wabaOwnsPhone(input.wabaId, input.phoneNumberId, token))) return { error: "El número no pertenece a la cuenta de WhatsApp autorizada." };
    const phone = await getPhoneNumber(input.phoneNumberId, token);
    await subscribeAppToWaba(input.wabaId, token);
    let pinEnc: string | null = null;
    // Número nuevo (solo API): hay que registrarlo con un PIN de verificación en dos pasos.
    if (mode === "cloud") {
      const pin = String(randomInt(100000, 1000000));
      await registerPhone(input.phoneNumberId, token, pin);
      pinEnc = encryptSecret(pin);
    }
    const data = {
      wabaId: input.wabaId,
      phoneNumberId: input.phoneNumberId,
      displayPhone: phone.display_phone_number ?? "",
      verifiedName: phone.verified_name ?? "",
      accessTokenEnc: encryptSecret(token),
      pinEnc,
      mode,
      status: "active",
      lastError: ""
    };
    await prisma.whatsAppConnection.upsert({ where: { organizationId: organization.id }, create: { organizationId: organization.id, ...data }, update: data });
  } catch (error) {
    console.error("[whatsapp] error conectando", error);
    return { error: friendly(error) };
  }
  revalidatePath("/panel/negocio");
  return { success: "¡Listo! Tu WhatsApp quedó conectado. Escríbele desde otro celular para probar el asistente." };
}

export async function setWhatsAppAgentEnabled(enabled: boolean) {
  const { organization } = await requireActiveOwner();
  await prisma.whatsAppConnection.updateMany({ where: { organizationId: organization.id }, data: { agentEnabled: enabled } });
  revalidatePath("/panel/negocio");
}

// Reactiva el asistente en todas las conversaciones que el dueño había tomado a mano.
export async function resumeAllConversations() {
  const { organization } = await requireActiveOwner();
  await prisma.whatsAppConversation.updateMany({ where: { organizationId: organization.id, botPausedUntil: { gt: new Date() } }, data: { botPausedUntil: null } });
  revalidatePath("/panel/negocio");
}

export async function disconnectWhatsApp() {
  const { organization } = await requireActiveOwner();
  const connection = await prisma.whatsAppConnection.findUnique({ where: { organizationId: organization.id } });
  if (!connection) return;
  try {
    await unsubscribeAppFromWaba(connection.wabaId, decryptSecret(connection.accessTokenEnc));
  } catch (error) {
    console.error("[whatsapp] no se pudo quitar la suscripción en Meta", error);
  }
  await prisma.whatsAppConnection.delete({ where: { id: connection.id } });
  revalidatePath("/panel/negocio");
}
