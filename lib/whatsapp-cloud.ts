import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

// Integración con WhatsApp Cloud API (Meta) para todos los negocios.
// Los tokens de cada negocio se guardan cifrados (AES-256-GCM) y nunca salen de la app:
// n8n solo recibe un permiso temporal ligado a un negocio y a un cliente.

export const GRAPH_VERSION = process.env.META_GRAPH_VERSION || "v24.0";
const GRAPH_URL = `https://graph.facebook.com/${GRAPH_VERSION}`;

// Horas que el asistente queda en pausa con un cliente cuando el dueño le responde desde su celular.
export const HUMAN_TAKEOVER_HOURS = 4;

export function whatsappEmbeddedSignupConfig() {
  const appId = process.env.NEXT_PUBLIC_META_APP_ID ?? "";
  const configId = process.env.NEXT_PUBLIC_META_ES_CONFIG_ID ?? "";
  return appId && configId ? { appId, configId, graphVersion: GRAPH_VERSION } : null;
}

export function isWhatsAppPlatformReady() {
  return !!(process.env.NEXT_PUBLIC_META_APP_ID && process.env.META_APP_SECRET && process.env.WHATSAPP_ENCRYPTION_KEY && process.env.N8N_AGENT_WEBHOOK_URL && process.env.N8N_SHARED_SECRET);
}

// ---------- Cifrado ----------

function masterKey(label: string) {
  const secret = process.env.WHATSAPP_ENCRYPTION_KEY;
  if (!secret || secret.length < 32) throw new Error("Falta WHATSAPP_ENCRYPTION_KEY (mínimo 32 caracteres).");
  return createHash("sha256").update(`${label}:${secret}`).digest();
}

export function encryptSecret(plain: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", masterKey("enc"), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), data.toString("base64url")].join(".");
}

export function decryptSecret(value: string) {
  const [version, iv, tag, data] = value.split(".");
  if (version !== "v1" || !iv || !tag || !data) throw new Error("Secreto cifrado inválido.");
  const decipher = createDecipheriv("aes-256-gcm", masterKey("enc"), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8");
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

// ---------- Permiso temporal para el agente (n8n) ----------
// Formato: gsa.<datos>.<firma>. Vale 15 minutos, para un negocio y un cliente.

const AGENT_TOKEN_TTL_SECONDS = 15 * 60;

export function issueAgentToken(organizationId: string, customerPhone: string) {
  const payload = Buffer.from(JSON.stringify({ o: organizationId, p: customerPhone, e: Math.floor(Date.now() / 1000) + AGENT_TOKEN_TTL_SECONDS })).toString("base64url");
  const signature = createHmac("sha256", masterKey("agent-token")).update(payload).digest("base64url");
  return `gsa.${payload}.${signature}`;
}

export function verifyAgentToken(token: string): { organizationId: string; customerPhone: string } | null {
  const [prefix, payload, signature] = token.split(".");
  if (prefix !== "gsa" || !payload || !signature) return null;
  let expected: string;
  try {
    expected = createHmac("sha256", masterKey("agent-token")).update(payload).digest("base64url");
  } catch {
    return null;
  }
  if (!safeEqual(signature, expected)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { o?: string; p?: string; e?: number };
    if (!data.o || !data.p || !data.e || data.e < Date.now() / 1000) return null;
    return { organizationId: data.o, customerPhone: data.p };
  } catch {
    return null;
  }
}

// ---------- Webhook de Meta ----------

export function verifyMetaSignature(rawBody: string, header: string | null) {
  const secret = process.env.META_APP_SECRET;
  if (!secret || !header?.startsWith("sha256=")) return false;
  const expected = `sha256=${createHmac("sha256", secret).update(rawBody, "utf8").digest("hex")}`;
  return safeEqual(header, expected);
}

export function verifySharedSecret(value: string | null) {
  const secret = process.env.N8N_SHARED_SECRET;
  return !!secret && !!value && safeEqual(value, secret);
}

// ---------- Graph API ----------

export class GraphError extends Error {
  constructor(message: string, readonly code: number | null, readonly status: number) {
    super(message);
  }
  // 190 = token inválido o vencido; 10/200 = permisos revocados.
  get isAuthError() {
    return this.code === 190 || this.code === 10 || this.code === 200 || this.status === 401;
  }
}

export async function graph<T = Record<string, unknown>>(path: string, options: { token?: string; method?: string; body?: unknown; query?: Record<string, string> } = {}): Promise<T> {
  const url = new URL(`${GRAPH_URL}/${path.replace(/^\//, "")}`);
  for (const [key, value] of Object.entries(options.query ?? {})) url.searchParams.set(key, value);
  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers: { ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}), ...(options.body ? { "Content-Type": "application/json" } : {}) },
    body: options.body ? JSON.stringify(options.body) : undefined,
    signal: AbortSignal.timeout(15_000),
    cache: "no-store"
  });
  const data = await response.json().catch(() => ({})) as { error?: { message?: string; code?: number; error_user_msg?: string } };
  if (!response.ok || data.error) throw new GraphError(data.error?.error_user_msg || data.error?.message || `Error ${response.status} de Meta`, data.error?.code ?? null, response.status);
  return data as T;
}

// Cambia el código del registro integrado por el token de negocio del cliente.
export async function exchangeSignupCode(code: string) {
  const data = await graph<{ access_token?: string }>("oauth/access_token", {
    query: { client_id: process.env.NEXT_PUBLIC_META_APP_ID ?? "", client_secret: process.env.META_APP_SECRET ?? "", code }
  });
  if (!data.access_token) throw new GraphError("Meta no devolvió el token de acceso.", null, 400);
  return data.access_token;
}

type PhoneInfo = { id: string; display_phone_number?: string; verified_name?: string; status?: string };

export async function getPhoneNumber(phoneNumberId: string, token: string) {
  return graph<PhoneInfo>(phoneNumberId, { token, query: { fields: "id,display_phone_number,verified_name,status" } });
}

// Números de la cuenta de WhatsApp Business (WABA) a los que el token tiene acceso.
export async function listWabaPhones(wabaId: string, token: string) {
  const data = await graph<{ data?: PhoneInfo[] }>(`${wabaId}/phone_numbers`, { token, query: { fields: "id,display_phone_number,verified_name,status", limit: "100" } });
  return data.data ?? [];
}

export async function wabaOwnsPhone(wabaId: string, phoneNumberId: string, token: string) {
  return (await listWabaPhones(wabaId, token)).some((phone) => phone.id === phoneNumberId);
}

export async function subscribeAppToWaba(wabaId: string, token: string) {
  await graph(`${wabaId}/subscribed_apps`, { token, method: "POST" });
}

export async function unsubscribeAppFromWaba(wabaId: string, token: string) {
  await graph(`${wabaId}/subscribed_apps`, { token, method: "DELETE" });
}

export async function registerPhone(phoneNumberId: string, token: string, pin: string) {
  await graph(`${phoneNumberId}/register`, { token, method: "POST", body: { messaging_product: "whatsapp", pin } });
}

export async function sendText(phoneNumberId: string, token: string, to: string, body: string) {
  const data = await graph<{ messages?: { id: string }[] }>(`${phoneNumberId}/messages`, {
    token,
    method: "POST",
    body: { messaging_product: "whatsapp", recipient_type: "individual", to, type: "text", text: { body: body.slice(0, 4096), preview_url: true } }
  });
  return data.messages?.[0]?.id ?? null;
}

// Marca el mensaje como leído y muestra "escribiendo…" mientras el asistente piensa.
export async function markReadWithTyping(phoneNumberId: string, token: string, messageId: string) {
  await graph(`${phoneNumberId}/messages`, { token, method: "POST", body: { messaging_product: "whatsapp", status: "read", message_id: messageId, typing_indicator: { type: "text" } } });
}
