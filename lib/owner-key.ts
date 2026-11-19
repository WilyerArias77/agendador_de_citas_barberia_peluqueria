import { createHmac, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// Clave del dueño de la plataforma: además de ser el administrador (correo en PLATFORM_ADMIN_EMAILS y confirmado),
// los menús "Plataforma · …" piden una clave única. Solo se guarda su huella (scrypt) en PLATFORM_OWNER_KEY_HASH,
// con el formato "<sal hex>:<hash hex>". Al acertarla, una cookie firmada abre el acceso por OWNER_UNLOCK_HOURS horas.

export const OWNER_COOKIE = "gs-owner";
export const OWNER_UNLOCK_HOURS = 8;

function signingKey() {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error("Falta BETTER_AUTH_SECRET.");
  return createHmac("sha256", secret).update("platform-owner-unlock").digest();
}

const sign = (payload: string) => createHmac("sha256", signingKey()).update(payload).digest("base64url");

function safeEqual(a: Buffer, b: Buffer) {
  return a.length === b.length && timingSafeEqual(a, b);
}

export function ownerKeyConfigured() {
  return /^[0-9a-f]{32}:[0-9a-f]{128}$/.test(process.env.PLATFORM_OWNER_KEY_HASH ?? "");
}

// Se ignoran espacios, guiones y mayúsculas para que sea fácil de escribir.
const normalize = (value: string) => value.replace(/[\s-]/g, "").toUpperCase();

export function checkOwnerKey(input: string) {
  if (!ownerKeyConfigured()) return false;
  const [salt, hash] = process.env.PLATFORM_OWNER_KEY_HASH!.split(":");
  const candidate = scryptSync(normalize(input), Buffer.from(salt, "hex"), 64);
  return safeEqual(candidate, Buffer.from(hash, "hex"));
}

export function ownerUnlockToken(userId: string, now = Date.now()) {
  const payload = `${userId}.${now + OWNER_UNLOCK_HOURS * 3_600_000}`;
  return `${payload}.${sign(payload)}`;
}

export async function isOwnerUnlocked(userId: string) {
  const value = (await cookies()).get(OWNER_COOKIE)?.value ?? "";
  const [id, expires, signature] = value.split(".");
  if (!id || !expires || !signature || id !== userId || Number(expires) < Date.now()) return false;
  return safeEqual(Buffer.from(signature), Buffer.from(sign(`${id}.${expires}`)));
}

// Para las páginas: si no ha ingresado la clave, va a /admin/clave y vuelve a `next` al acertarla.
export async function requireOwnerUnlock(userId: string, next: string) {
  if (!(await isOwnerUnlocked(userId))) redirect(`/admin/clave?next=${encodeURIComponent(next)}`);
}
