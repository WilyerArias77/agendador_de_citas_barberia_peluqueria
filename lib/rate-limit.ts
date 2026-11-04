import { headers } from "next/headers";
import { prisma } from "./prisma";

// Límite simple de ventana fija guardado en Postgres (sirve entre instancias de Vercel).
export async function isRateLimited(key: string, max: number, windowSeconds: number) {
  const now = BigInt(Date.now());
  const windowStart = now - BigInt(windowSeconds * 1000);
  const entry = await prisma.rateLimit.findUnique({ where: { key } });
  if (!entry || entry.lastRequest < windowStart) {
    await prisma.rateLimit.upsert({ where: { key }, create: { key, count: 1, lastRequest: now }, update: { count: 1, lastRequest: now } });
    return false;
  }
  if (entry.count >= max) return true;
  await prisma.rateLimit.update({ where: { key }, data: { count: { increment: 1 } } });
  return false;
}

export async function clientIp(source?: Headers) {
  const list = source ?? await headers();
  const forwarded = list.get("x-forwarded-for") ?? "";
  return forwarded.split(",")[0]?.trim() || list.get("x-real-ip") || "unknown";
}
