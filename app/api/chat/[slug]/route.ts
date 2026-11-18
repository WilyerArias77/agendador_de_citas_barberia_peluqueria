import { randomBytes } from "node:crypto";
import { apiError, apiJson, readJson } from "../../../../lib/agent-api";
import { normalizePhone } from "../../../../lib/booking";
import { hasActiveAccess } from "../../../../lib/organization";
import { prisma } from "../../../../lib/prisma";
import { clientIp, isRateLimited } from "../../../../lib/rate-limit";
import { callAgent } from "../../../../lib/whatsapp-bot";

// Chat web del "Agente de citas" en la página de reservas de cada negocio.
// Usa el mismo agente de n8n que WhatsApp. La sesión es un identificador aleatorio que guarda el navegador del cliente.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type ChatMessage = { from: "agent" | "customer"; text: string };

const SESSION_RE = /^[A-Za-z0-9_-]{20,40}$/;
const sessionKey = (sessionId: string) => `web:${sessionId}`;

function greetingInstruction(businessName: string) {
  return `[El cliente acaba de abrir el chat en la página de reservas. Salúdalo presentándote como el *Agente de citas* de ${businessName}. Usa info_negocio y cuéntale en pocas líneas sobre la barbería: dirección, horario y los servicios con su precio. Ofrécele agendar una cita. No le pidas datos todavía.]`;
}

async function history(conversationId: string): Promise<ChatMessage[]> {
  const messages = await prisma.whatsAppMessage.findMany({ where: { conversationId }, orderBy: { createdAt: "asc" }, take: 60 });
  return messages.map((m) => ({ from: m.direction === "in" ? "customer" : "agent", text: m.body }));
}

async function save(conversationId: string, direction: "in" | "out", body: string) {
  await prisma.whatsAppMessage.create({ data: { conversationId, waMessageId: `web-${direction}-${randomBytes(12).toString("base64url")}`, direction, body: body.slice(0, 4000) } });
  await prisma.whatsAppConversation.update({ where: { id: conversationId }, data: { lastMessageAt: new Date() } });
}

export async function POST(request: Request, props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  const body = await readJson(request);
  if (!body) return apiError("Solicitud inválida.", 400);
  const organization = await prisma.organization.findUnique({ where: { slug } });
  if (!organization) return apiError("Negocio no encontrado.", 404);
  if (!hasActiveAccess(organization)) return apiError("El agente de este negocio no está disponible en este momento.", 403);

  const ip = await clientIp(request.headers);
  if (await isRateLimited(`chat-ip:${ip}`, 60, 600)) return apiError("Estás escribiendo muy rápido. Espera unos minutos, por favor.", 429);

  const action = String(body.action ?? "");
  const sessionId = typeof body.sessionId === "string" && SESSION_RE.test(body.sessionId) ? body.sessionId : null;
  const existing = sessionId ? await prisma.whatsAppConversation.findUnique({ where: { organizationId_customerPhone: { organizationId: organization.id, customerPhone: sessionKey(sessionId) } } }) : null;

  // Abrir el chat: si ya había conversación se devuelve; si no, el agente saluda.
  if (action === "open") {
    if (existing) return apiJson({ sessionId, profile: { name: existing.customerName, hasPhone: !!existing.contactPhone }, messages: await history(existing.id) });
    if (await isRateLimited(`chat-open:${ip}`, 10, 3600)) return apiError("Abriste muchos chats. Intenta de nuevo más tarde.", 429);
    const newSession = randomBytes(18).toString("base64url");
    const conversation = await prisma.whatsAppConversation.create({ data: { organizationId: organization.id, customerPhone: sessionKey(newSession) } });
    const reply = await callAgent({ organization, conversationId: conversation.id, customerPhone: sessionKey(newSession), customerName: "", webSessionId: newSession, instruction: greetingInstruction(organization.name) });
    await save(conversation.id, "out", reply);
    return apiJson({ sessionId: newSession, profile: { name: "", hasPhone: false }, messages: [{ from: "agent", text: reply }] });
  }

  if (!existing || !sessionId) return apiError("La conversación venció. Cierra y vuelve a abrir el chat.", 404);

  // Datos del cliente: nombre y WhatsApp, necesarios para agendar a su nombre.
  if (action === "profile") {
    const name = String(body.name ?? "").trim().slice(0, 80);
    const phone = normalizePhone(String(body.phone ?? ""));
    if (name.length < 2) return apiError("Escribe tu nombre.", 400);
    if (phone.replace(/\D/g, "").length < 10) return apiError("Escribe tu número de WhatsApp (10 dígitos).", 400);
    await prisma.whatsAppConversation.update({ where: { id: existing.id }, data: { customerName: name, contactPhone: phone } });
    return apiJson({ profile: { name, hasPhone: true } });
  }

  if (action === "message") {
    const text = String(body.text ?? "").trim().slice(0, 1000);
    if (!text) return apiError("Escribe un mensaje.", 400);
    if (!existing.contactPhone) return apiError("Antes de continuar, escribe tu nombre y tu WhatsApp.", 400);
    if (await isRateLimited(`chat-session:${sessionId}`, 30, 600)) return apiError("Has enviado muchos mensajes. Espera unos minutos, por favor.", 429);
    await save(existing.id, "in", text);
    const reply = await callAgent({ organization, conversationId: existing.id, customerPhone: existing.contactPhone, customerName: existing.customerName, webSessionId: sessionId });
    await save(existing.id, "out", reply);
    return apiJson({ messages: [{ from: "agent", text: reply }] });
  }

  return apiError("Acción no válida.", 400);
}
