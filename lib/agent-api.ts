import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import type { Booking, Organization, Service } from "@prisma/client";
import { hasActiveAccess } from "./organization";
import { prisma } from "./prisma";
import { dateInZone, formatLongDate, formatTime } from "./time";

// API para integraciones (n8n / agente de WhatsApp). Cada negocio tiene su propia llave.

export function hashApiKey(key: string) {
  return createHash("sha256").update(key).digest("hex");
}

export function generateApiKey() {
  const key = `gs_live_${randomBytes(24).toString("base64url")}`;
  return { key, hash: hashApiKey(key), hint: `${key.slice(0, 12)}…${key.slice(-4)}` };
}

export function apiError(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

export function apiJson(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export async function authenticateAgent(request: Request): Promise<{ organization: Organization } | { response: NextResponse }> {
  const header = request.headers.get("authorization") ?? "";
  const key = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!key) return { response: apiError("Falta la llave de API (Authorization: Bearer …).", 401) };
  const organization = await prisma.organization.findUnique({ where: { agentApiKeyHash: hashApiKey(key) } });
  if (!organization) return { response: apiError("Llave de API inválida.", 401) };
  if (!hasActiveAccess(organization)) return { response: apiError("El plan de este negocio está inactivo.", 403) };
  return { organization };
}

export function serializeBooking(booking: Booking & { service: Service }, timezone: string) {
  return {
    id: booking.id,
    serviceId: booking.serviceId,
    serviceName: booking.service.name,
    barberId: booking.barberId,
    startsAt: booking.startsAt.toISOString(),
    date: dateInZone(booking.startsAt, timezone),
    time: formatTime(booking.startsAt, timezone),
    label: `${formatLongDate(booking.startsAt, timezone)} a las ${formatTime(booking.startsAt, timezone)}`,
    status: booking.status,
    customerName: booking.customerName,
    price: booking.priceInCents / 100
  };
}

export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await request.json();
    return body && typeof body === "object" ? body as Record<string, unknown> : null;
  } catch {
    return null;
  }
}
