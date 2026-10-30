import { apiError, apiJson, authenticateAgent, readJson, serializeBooking } from "../../../../../lib/agent-api";
import { cancelBooking, phonesMatch, rescheduleBooking } from "../../../../../lib/booking";
import { prisma } from "../../../../../lib/prisma";

export const dynamic = "force-dynamic";

// El cliente solo puede tocar sus propias citas futuras: el teléfono debe coincidir con el de la reserva.
async function findOwnedBooking(organizationId: string, id: string, phone: string) {
  const booking = await prisma.booking.findFirst({ where: { id, organizationId } });
  return booking && phonesMatch(booking.customerPhone, phone) ? booking : null;
}

function pastBookingError(booking: { startsAt: Date }) {
  return booking.startsAt.getTime() <= Date.now() ? apiError("Esa cita ya pasó, no se puede modificar.", 409) : null;
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = await authenticateAgent(request);
  if ("response" in auth) return auth.response;
  const { organization } = auth;
  const body = await readJson(request);
  if (!body) return apiError("El cuerpo debe ser JSON.", 400);
  const owned = await findOwnedBooking(organization.id, params.id, String(body.customerPhone ?? ""));
  if (!owned) return apiError("No encontramos una cita con ese código para este teléfono.", 404);
  const past = pastBookingError(owned);
  if (past) return past;
  const result = await rescheduleBooking({ organizationId: organization.id, timezone: organization.timezone, bookingId: params.id, startsAt: String(body.startsAt ?? ""), serviceId: body.serviceId ? String(body.serviceId) : undefined });
  if (!result.ok) return apiError(result.error, result.status ?? 400);
  const booking = await prisma.booking.findUniqueOrThrow({ where: { id: params.id }, include: { service: true } });
  return apiJson({ booking: serializeBooking(booking, organization.timezone) });
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const auth = await authenticateAgent(request);
  if ("response" in auth) return auth.response;
  const phone = new URL(request.url).searchParams.get("phone") ?? "";
  const owned = await findOwnedBooking(auth.organization.id, params.id, phone);
  if (!owned) return apiError("No encontramos una cita con ese código para este teléfono.", 404);
  const past = pastBookingError(owned);
  if (past) return past;
  const result = await cancelBooking(auth.organization.id, params.id);
  if (!result.ok) return apiError(result.error, result.status ?? 400);
  return apiJson({ ok: true });
}
