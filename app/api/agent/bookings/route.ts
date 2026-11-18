import { apiError, apiJson, authenticateAgent, readJson, serializeBooking } from "../../../../lib/agent-api";
import { createBooking, phonesMatch } from "../../../../lib/booking";
import { prisma } from "../../../../lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await authenticateAgent(request);
  if ("response" in auth) return auth.response;
  const { organization } = auth;
  const phone = auth.customerPhone ?? new URL(request.url).searchParams.get("phone") ?? "";
  if (phone.replace(/\D/g, "").length < 7) return apiError("Falta el teléfono del cliente (phone).", 400);
  // Chat web: solo las reservas creadas en esa sesión (el teléfono lo escribe el cliente y no está verificado).
  const upcoming = await prisma.booking.findMany({ where: { organizationId: organization.id, status: "confirmed", startsAt: { gte: new Date() }, ...(auth.webSessionId ? { webSessionId: auth.webSessionId } : {}) }, include: { service: true }, orderBy: { startsAt: "asc" }, take: 200 });
  const bookings = upcoming.filter((booking) => phonesMatch(booking.customerPhone, phone)).map((booking) => serializeBooking(booking, organization.timezone));
  return apiJson({ bookings });
}

export async function POST(request: Request) {
  const auth = await authenticateAgent(request);
  if ("response" in auth) return auth.response;
  const { organization } = auth;
  const body = await readJson(request);
  if (!body) return apiError("El cuerpo debe ser JSON.", 400);
  const result = await createBooking({
    organizationId: organization.id,
    timezone: organization.timezone,
    serviceId: String(body.serviceId ?? ""),
    barberId: body.barberId ? String(body.barberId) : undefined,
    startsAt: String(body.startsAt ?? ""),
    customerName: String(body.customerName ?? ""),
    customerPhone: auth.customerPhone ?? String(body.customerPhone ?? ""),
    notes: String(body.notes ?? ""),
    webSessionId: auth.webSessionId ?? undefined
  });
  if (!result.ok) return apiError(result.error, result.status ?? 400);
  const booking = await prisma.booking.findUniqueOrThrow({ where: { id: result.bookingId }, include: { service: true } });
  return apiJson({ booking: serializeBooking(booking, organization.timezone) }, 201);
}
