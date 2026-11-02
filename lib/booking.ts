import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { addDays, dateInZone, formatMoney, formatTime, fromMinutes, isValidDate, toMinutes, weekdayOf, zonedToUtc } from "./time";

const SLOT_STEP_MINUTES = 30;
const MIN_LEAD_MINUTES = 30;
export const BOOKING_WINDOW_DAYS = 30;
const MAX_UPCOMING_PER_PHONE = 2;

export type Slot = { time: string; startsAt: string };

type SlotOptions = { organizationId: string; timezone: string; serviceId: string; date: string; barberId?: string | null; ignoreLeadTime?: boolean; excludeBookingId?: string };

export function normalizePhone(phone: string) {
  return phone.replace(/[^\d+]/g, "").slice(0, 20);
}

// Compara por los últimos 10 dígitos para que "300 123 4567" y "573001234567" coincidan.
export function phonesMatch(a: string, b: string) {
  const left = a.replace(/\D/g, "").slice(-10);
  return left.length >= 7 && left === b.replace(/\D/g, "").slice(-10);
}

// Cada barbero tiene su propia agenda; las citas sin barbero (anteriores a los barberos) ocupan a todos.
function busyFor(barberId: string | null): Prisma.BookingWhereInput {
  return barberId ? { OR: [{ barberId }, { barberId: null }] } : {};
}

export function activeBarbers(organizationId: string) {
  return prisma.barber.findMany({ where: { organizationId, active: true }, orderBy: { createdAt: "asc" }, select: { id: true, name: true } });
}

// Sin barbero elegido (p. ej. el agente de WhatsApp): un horario sirve si al menos un barbero está libre.
export async function getAvailableSlots(options: SlotOptions): Promise<Slot[]> {
  if (options.barberId !== undefined) return slotsFor(options, options.barberId);
  const barbers = await activeBarbers(options.organizationId);
  if (barbers.length === 0) return slotsFor(options, null);
  const merged = new Map<string, Slot>();
  for (const barber of barbers) for (const slot of await slotsFor(options, barber.id)) merged.set(slot.startsAt, slot);
  return Array.from(merged.values()).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

async function slotsFor({ organizationId, timezone, serviceId, date, ignoreLeadTime, excludeBookingId }: SlotOptions, barberId: string | null): Promise<Slot[]> {
  if (!isValidDate(date)) return [];
  const [service, availability] = await Promise.all([
    prisma.service.findFirst({ where: { id: serviceId, organizationId, active: true } }),
    prisma.weeklyAvailability.findUnique({ where: { organizationId_weekday: { organizationId, weekday: weekdayOf(date) } } })
  ]);
  if (!service || !availability) return [];

  const dayStart = zonedToUtc(date, "00:00", timezone);
  const dayEnd = zonedToUtc(addDays(date, 1), "00:00", timezone);
  const [bookings, exceptions] = await Promise.all([
    prisma.booking.findMany({ where: { organizationId, ...busyFor(barberId), status: { not: "cancelled" }, id: excludeBookingId ? { not: excludeBookingId } : undefined, startsAt: { lt: dayEnd }, endsAt: { gt: dayStart } }, select: { startsAt: true, endsAt: true } }),
    prisma.availabilityException.findMany({ where: { organizationId, startsAt: { lt: dayEnd }, endsAt: { gt: dayStart } }, select: { startsAt: true, endsAt: true } })
  ]);
  const busy = [...bookings, ...exceptions].map((range) => [range.startsAt.getTime(), range.endsAt.getTime()]);
  if (availability.breakStartsAt && availability.breakEndsAt) {
    busy.push([zonedToUtc(date, availability.breakStartsAt, timezone).getTime(), zonedToUtc(date, availability.breakEndsAt, timezone).getTime()]);
  }

  const earliest = ignoreLeadTime ? 0 : Date.now() + MIN_LEAD_MINUTES * 60_000;
  const duration = service.durationMinutes * 60_000;
  const slots: Slot[] = [];
  for (let minute = toMinutes(availability.startsAt); minute + service.durationMinutes <= toMinutes(availability.endsAt); minute += SLOT_STEP_MINUTES) {
    const start = zonedToUtc(date, fromMinutes(minute), timezone).getTime();
    const end = start + duration;
    if (start < earliest) continue;
    if (busy.some(([busyStart, busyEnd]) => start < busyEnd && end > busyStart)) continue;
    slots.push({ time: fromMinutes(minute), startsAt: new Date(start).toISOString() });
  }
  return slots;
}

export type BookingInput = { organizationId: string; timezone: string; serviceId: string; barberId?: string; startsAt: string; customerName: string; customerPhone: string; customerEmail?: string; notes?: string; fromPanel?: boolean };
export type BookingResult = { ok: true; bookingId: string } | { ok: false; error: string; status?: number };

// Valida el horario y resuelve el barbero: el pedido, o el primero libre si no se eligió ninguno.
async function checkSlot(input: { organizationId: string; timezone: string; serviceId: string; barberId?: string | null; startsAt: string; fromPanel?: boolean; excludeBookingId?: string }): Promise<{ ok: true; startsAt: Date; barberId: string | null } | { ok: false; error: string; status: number }> {
  const startsAt = new Date(input.startsAt);
  if (Number.isNaN(startsAt.getTime())) return { ok: false, error: "Elige un horario.", status: 400 };
  const date = dateInZone(startsAt, input.timezone);
  if (!input.fromPanel && date > addDays(dateInZone(new Date(), input.timezone), BOOKING_WINDOW_DAYS)) return { ok: false, error: `Solo se puede reservar con hasta ${BOOKING_WINDOW_DAYS} días de anticipación.`, status: 400 };
  const barbers = await activeBarbers(input.organizationId);
  if (input.barberId && !barbers.some((barber) => barber.id === input.barberId)) return { ok: false, error: "Elige un barbero disponible.", status: 400 };
  const candidates = barbers.length === 0 ? [null] : input.barberId ? [input.barberId] : barbers.map((barber) => barber.id);
  for (const barberId of candidates) {
    const slots = await getAvailableSlots({ organizationId: input.organizationId, timezone: input.timezone, serviceId: input.serviceId, date, barberId, ignoreLeadTime: input.fromPanel, excludeBookingId: input.excludeBookingId });
    if (slots.some((slot) => slot.startsAt === startsAt.toISOString())) return { ok: true, startsAt, barberId };
  }
  return { ok: false, error: `El horario de las ${formatTime(startsAt, input.timezone)} ya no está disponible. Elige otro.`, status: 409 };
}

const SLOT_TAKEN: BookingResult = { ok: false, error: "Ese horario se acaba de ocupar. Elige otro.", status: 409 };

export async function createBooking(input: BookingInput): Promise<BookingResult> {
  const customerName = input.customerName.trim().slice(0, 80);
  const customerPhone = normalizePhone(input.customerPhone);
  if (customerName.length < 2) return { ok: false, error: "Escribe el nombre del cliente.", status: 400 };
  if (customerPhone.replace(/\D/g, "").length < 7) return { ok: false, error: "Escribe un teléfono válido.", status: 400 };
  if (!input.fromPanel) {
    const upcoming = await prisma.booking.findMany({ where: { organizationId: input.organizationId, status: "confirmed", startsAt: { gte: new Date() } }, select: { customerPhone: true }, take: 2000 });
    if (upcoming.filter((booking) => phonesMatch(booking.customerPhone, customerPhone)).length >= MAX_UPCOMING_PER_PHONE) return { ok: false, error: `Ya tienes ${MAX_UPCOMING_PER_PHONE} citas próximas en este negocio. Para agendar otra, escríbele directamente.`, status: 429 };
  }
  const slot = await checkSlot(input);
  if (!slot.ok) return slot;
  const { startsAt, barberId } = slot;

  try {
    const booking = await prisma.$transaction(async (tx) => {
      const service = await tx.service.findFirstOrThrow({ where: { id: input.serviceId, organizationId: input.organizationId } });
      const endsAt = new Date(startsAt.getTime() + service.durationMinutes * 60_000);
      const overlapping = await tx.booking.count({ where: { organizationId: input.organizationId, ...busyFor(barberId), status: { not: "cancelled" }, startsAt: { lt: endsAt }, endsAt: { gt: startsAt } } });
      if (overlapping > 0) throw new Error("SLOT_TAKEN");
      return tx.booking.create({ data: { organizationId: input.organizationId, serviceId: service.id, barberId, customerName, customerPhone, customerEmail: (input.customerEmail ?? "").trim().slice(0, 120), notes: (input.notes ?? "").trim().slice(0, 300), startsAt, endsAt, priceInCents: service.priceInCents } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return { ok: true, bookingId: booking.id };
  } catch {
    return SLOT_TAKEN;
  }
}

export async function rescheduleBooking(input: { organizationId: string; timezone: string; bookingId: string; startsAt: string; serviceId?: string; barberId?: string; fromPanel?: boolean }): Promise<BookingResult> {
  const booking = await prisma.booking.findFirst({ where: { id: input.bookingId, organizationId: input.organizationId } });
  if (!booking) return { ok: false, error: "No encontramos esa cita.", status: 404 };
  if (booking.status !== "confirmed") return { ok: false, error: "Esa cita ya no se puede reprogramar.", status: 409 };
  const serviceId = input.serviceId || booking.serviceId;
  const slot = await checkSlot({ ...input, serviceId, barberId: input.barberId ?? booking.barberId, excludeBookingId: booking.id });
  if (!slot.ok) return slot;
  const { startsAt, barberId } = slot;

  try {
    await prisma.$transaction(async (tx) => {
      const service = await tx.service.findFirstOrThrow({ where: { id: serviceId, organizationId: input.organizationId } });
      const endsAt = new Date(startsAt.getTime() + service.durationMinutes * 60_000);
      const overlapping = await tx.booking.count({ where: { organizationId: input.organizationId, ...busyFor(barberId), id: { not: booking.id }, status: { not: "cancelled" }, startsAt: { lt: endsAt }, endsAt: { gt: startsAt } } });
      if (overlapping > 0) throw new Error("SLOT_TAKEN");
      await tx.booking.update({ where: { id: booking.id }, data: { serviceId: service.id, barberId, startsAt, endsAt, priceInCents: service.priceInCents } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return { ok: true, bookingId: booking.id };
  } catch {
    return SLOT_TAKEN;
  }
}

export async function cancelBooking(organizationId: string, bookingId: string): Promise<BookingResult> {
  const result = await prisma.booking.updateMany({ where: { id: bookingId, organizationId, status: "confirmed" }, data: { status: "cancelled" } });
  return result.count === 1 ? { ok: true, bookingId } : { ok: false, error: "No encontramos una cita activa con ese código.", status: 404 };
}

export function upcomingDates(timezone: string, days = BOOKING_WINDOW_DAYS) {
  const today = dateInZone(new Date(), timezone);
  return Array.from({ length: days }, (_, index) => addDays(today, index));
}

export async function getPickerData(organization: { id: string; timezone: string; currency?: string }) {
  const [services, availability, barbers] = await Promise.all([
    prisma.service.findMany({ where: { organizationId: organization.id, active: true }, orderBy: { createdAt: "asc" } }),
    prisma.weeklyAvailability.findMany({ where: { organizationId: organization.id }, select: { weekday: true } }),
    activeBarbers(organization.id)
  ]);
  const openDays = new Set(availability.map((day) => day.weekday));
  return {
    barbers,
    services: services.map((service) => ({ id: service.id, name: service.name, description: service.description, duration: `${service.durationMinutes} min`, price: formatMoney(service.priceInCents, service.currency) })),
    dates: upcomingDates(organization.timezone).map((value) => ({ value, open: openDays.has(weekdayOf(value)) }))
  };
}
