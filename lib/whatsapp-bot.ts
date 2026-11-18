import { Prisma, type Organization, type WhatsAppConnection } from "@prisma/client";
import { hasActiveAccess, publicBookingUrl } from "./organization";
import { prisma } from "./prisma";
import { isRateLimited } from "./rate-limit";
import { removeConnection, trialExpired } from "./whatsapp-access";
import { todayInZone } from "./time";
import { GraphError, HUMAN_TAKEOVER_HOURS, decryptSecret, issueAgentToken, markReadWithTyping, sendText } from "./whatsapp-cloud";

// Procesa lo que Meta envía al webhook único de la plataforma y lo enruta al negocio por phone_number_id.
// Flujo por mensaje: guardar (sin duplicados) → reglas (plan, pausa, límite) → esperar ráfaga → n8n → responder.

type WaMessage = {
  id: string;
  from: string;
  timestamp?: string;
  type?: string;
  text?: { body?: string };
  button?: { text?: string };
  interactive?: { button_reply?: { title?: string }; list_reply?: { title?: string } };
};
type WaEcho = { id: string; to: string; type?: string; text?: { body?: string } };
type ChangeValue = {
  metadata?: { phone_number_id?: string };
  contacts?: { wa_id?: string; profile?: { name?: string } }[];
  messages?: WaMessage[];
  message_echoes?: WaEcho[];
};
export type WebhookPayload = { object?: string; entry?: { changes?: { field?: string; value?: ChangeValue }[] }[] };

type ConnectionWithOrg = WhatsAppConnection & { organization: Organization };

const BURST_WAIT_MS = 2500;
const MAX_MESSAGE_AGE_MS = 60 * 60 * 1000;
const NON_TEXT_REPLY = "¡Hola! 💈 Por ahora solo puedo leer mensajes de texto. ¿Me escribes lo que necesitas? Con gusto te ayudo a reservar, cambiar o cancelar tu cita, o te cuento horarios y precios.";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function handleWebhookPayload(payload: WebhookPayload) {
  const jobs: Promise<unknown>[] = [];
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      const phoneNumberId = value?.metadata?.phone_number_id;
      if (!value || !phoneNumberId) continue;
      if (change.field === "messages") {
        for (const message of value.messages ?? []) {
          const name = value.contacts?.find((contact) => contact.wa_id === message.from)?.profile?.name ?? "";
          jobs.push(handleIncoming(phoneNumberId, message, name));
        }
      }
      if (change.field === "smb_message_echoes") {
        for (const echo of value.message_echoes ?? []) jobs.push(handleOwnerEcho(phoneNumberId, echo));
      }
    }
  }
  const results = await Promise.allSettled(jobs);
  for (const result of results) if (result.status === "rejected") console.error("[whatsapp] error procesando mensaje", result.reason);
}

function messageText(message: WaMessage) {
  return (message.text?.body ?? message.button?.text ?? message.interactive?.button_reply?.title ?? message.interactive?.list_reply?.title ?? "").trim();
}

async function findConnection(phoneNumberId: string) {
  return prisma.whatsAppConnection.findUnique({ where: { phoneNumberId }, include: { organization: true } });
}

// Guarda el mensaje; devuelve false si ya existía (reintento de Meta).
async function saveMessage(conversationId: string, waMessageId: string, direction: "in" | "out" | "echo", body: string) {
  try {
    await prisma.whatsAppMessage.create({ data: { conversationId, waMessageId, direction, body: body.slice(0, 4000) } });
    return true;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return false;
    throw error;
  }
}

async function handleIncoming(phoneNumberId: string, message: WaMessage, customerName: string) {
  const connection = await findConnection(phoneNumberId);
  if (!connection || connection.status === "disconnected") return;
  // La prueba gratis terminó sin pagar: el número se desconecta de la plataforma (además de la tarea diaria).
  if (trialExpired(connection.organization)) {
    await removeConnection(connection);
    return;
  }
  const sentAt = Number(message.timestamp ?? 0) * 1000;
  if (sentAt && Date.now() - sentAt > MAX_MESSAGE_AGE_MS) return;

  const text = messageText(message);
  const conversation = await prisma.whatsAppConversation.upsert({
    where: { organizationId_customerPhone: { organizationId: connection.organizationId, customerPhone: message.from } },
    create: { organizationId: connection.organizationId, customerPhone: message.from, customerName },
    update: { lastMessageAt: new Date(), ...(customerName ? { customerName } : {}) }
  });
  if (!(await saveMessage(conversation.id, message.id, "in", text || `[${message.type ?? "mensaje"}]`))) return;
  await prisma.whatsAppConnection.update({ where: { id: connection.id }, data: { lastMessageAt: new Date() } });

  if (connection.status !== "active" || !connection.agentEnabled || !hasActiveAccess(connection.organization)) return;
  if (conversation.botPausedUntil && conversation.botPausedUntil > new Date()) return;
  // Freno contra abuso o bucles: máximo 30 mensajes por cliente cada 10 minutos.
  if (await isRateLimited(`wa:${connection.organizationId}:${message.from}`, 30, 600)) return;

  const token = decryptSecret(connection.accessTokenEnc);
  markReadWithTyping(phoneNumberId, token, message.id).catch(() => undefined);

  if (!text) {
    await reply(connection, token, conversation.id, message.from, NON_TEXT_REPLY);
    return;
  }

  // Si el cliente manda varios mensajes seguidos, solo responde el último (con todo el contexto).
  await sleep(BURST_WAIT_MS);
  const latest = await prisma.whatsAppMessage.findFirst({ where: { conversationId: conversation.id, direction: "in" }, orderBy: { createdAt: "desc" } });
  if (latest?.waMessageId !== message.id) return;

  const answer = await askAgent(connection, conversation.id, message.from, customerName);
  const fresh = await prisma.whatsAppConversation.findUnique({ where: { id: conversation.id } });
  if (fresh?.botPausedUntil && fresh.botPausedUntil > new Date()) return;
  await reply(connection, token, conversation.id, message.from, answer);
}

// El dueño respondió desde la app WhatsApp Business (coexistencia): el asistente le cede la conversación.
async function handleOwnerEcho(phoneNumberId: string, echo: WaEcho) {
  const connection = await findConnection(phoneNumberId);
  if (!connection || !echo.to) return;
  const conversation = await prisma.whatsAppConversation.upsert({
    where: { organizationId_customerPhone: { organizationId: connection.organizationId, customerPhone: echo.to } },
    create: { organizationId: connection.organizationId, customerPhone: echo.to, botPausedUntil: new Date(Date.now() + HUMAN_TAKEOVER_HOURS * 3_600_000) },
    update: { botPausedUntil: new Date(Date.now() + HUMAN_TAKEOVER_HOURS * 3_600_000), lastMessageAt: new Date() }
  });
  await saveMessage(conversation.id, echo.id, "echo", echo.text?.body ?? `[${echo.type ?? "mensaje"}]`);
}

async function askAgent(connection: ConnectionWithOrg, conversationId: string, customerPhone: string, customerName: string) {
  const organization = connection.organization;
  const bookingUrl = publicBookingUrl(organization.slug);
  const fallback = `¡Hola! 💈 En este momento no puedo responderte por aquí. Puedes reservar tu cita en ${bookingUrl}${organization.phone ? ` o escribirnos al ${organization.phone}` : ""}.`;
  const url = process.env.N8N_AGENT_WEBHOOK_URL;
  const secret = process.env.N8N_SHARED_SECRET;
  if (!url || !secret) return fallback;

  const since = new Date(Date.now() - 24 * 3_600_000);
  const recent = (await prisma.whatsAppMessage.findMany({ where: { conversationId, createdAt: { gte: since } }, orderBy: { createdAt: "desc" }, take: 21 })).reverse();
  const lastAnswer = recent.findLastIndex((m) => m.direction !== "in");
  const pending = recent.slice(lastAnswer + 1).map((m) => m.body).join("\n");
  const history = recent.slice(0, lastAnswer + 1).slice(-20).map((m) => `${m.direction === "in" ? "Cliente" : m.direction === "echo" ? "Barbería (persona)" : "Asistente"}: ${m.body}`).join("\n");

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Agent-Secret": secret },
      body: JSON.stringify({
        organizationId: organization.id,
        business: { name: organization.name, timezone: organization.timezone, today: todayInZone(organization.timezone), phone: organization.phone, bookingUrl },
        customer: { phone: customerPhone, name: customerName },
        message: pending,
        history,
        apiBaseUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/api/agent`,
        agentToken: issueAgentToken(organization.id, customerPhone)
      }),
      signal: AbortSignal.timeout(55_000),
      cache: "no-store"
    });
    const data = await response.json().catch(() => null) as { reply?: unknown } | null;
    const text = typeof data?.reply === "string" ? data.reply.trim() : "";
    if (!response.ok || !text) {
      console.error("[whatsapp] n8n respondió sin texto", response.status);
      return fallback;
    }
    return text;
  } catch (error) {
    console.error("[whatsapp] no se pudo contactar a n8n", error);
    return fallback;
  }
}

async function reply(connection: ConnectionWithOrg, token: string, conversationId: string, to: string, body: string) {
  try {
    const id = await sendText(connection.phoneNumberId, token, to, body);
    await saveMessage(conversationId, id ?? `out-${Date.now()}-${Math.random().toString(36).slice(2)}`, "out", body);
    if (connection.lastError) await prisma.whatsAppConnection.update({ where: { id: connection.id }, data: { lastError: "" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const authFailed = error instanceof GraphError && error.isAuthError;
    await prisma.whatsAppConnection.update({ where: { id: connection.id }, data: { lastError: message.slice(0, 300), ...(authFailed ? { status: "error" } : {}) } });
    throw error;
  }
}
