import { after } from "next/server";
import { handleWebhookPayload, type WebhookPayload } from "../../../../lib/whatsapp-bot";
import { verifyMetaSignature } from "../../../../lib/whatsapp-cloud";

// Webhook único de la plataforma: Meta envía aquí los mensajes de TODOS los negocios conectados.
export const dynamic = "force-dynamic";
export const maxDuration = 90;

// Verificación que hace Meta al guardar la URL del webhook.
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
  if (verifyToken && params.get("hub.mode") === "subscribe" && params.get("hub.verify_token") === verifyToken) {
    return new Response(params.get("hub.challenge") ?? "", { status: 200, headers: { "Content-Type": "text/plain" } });
  }
  return new Response("Forbidden", { status: 403 });
}

export async function POST(request: Request) {
  const raw = await request.text();
  // Solo se aceptan mensajes firmados por Meta con el secreto de la app.
  if (!verifyMetaSignature(raw, request.headers.get("x-hub-signature-256"))) return new Response("Invalid signature", { status: 401 });
  let payload: WebhookPayload;
  try {
    payload = JSON.parse(raw) as WebhookPayload;
  } catch {
    return new Response("Bad request", { status: 400 });
  }
  // Se responde 200 de inmediato (Meta reintenta si tardamos) y se procesa después.
  after(() => handleWebhookPayload(payload));
  return new Response("OK", { status: 200 });
}
