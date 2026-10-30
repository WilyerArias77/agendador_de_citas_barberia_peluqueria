import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { addDays, dateInZone, formatMoney, formatTime, fromMinutes, isValidDate, toMinutes, weekdayOf, zonedToUtc } from "./time";

const SLOT_STEP_MINUTES = 15;
const MIN_LEAD_MINUTES = 30;
export const BOOKING_WINDOW_DAYS = 30;

export type Slot = { time: string; startsAt: string };

type SlotOptions = { organizationId: string; timezone: string; serviceId: string; date: string; ignoreLeadTime?: boolean; excludeBookingId?: string };

export function normalizePhone(phone: string) {
  return phone.replace(/[^\d+]/g, "").slice(0, 20);
}

// Compara por los últimos 10 dígitos para que "300 123 4567" y "573001234567" coincidan.
export function phonesMatch(a: string, b: string) {
  const left = a.replace(/\D/g, "").slice(-10);
  return left.length >= 7 && left === b.replace(/\D/g, "").slice(-10);
}

export async function getAvailableSlots({ organizationId, timezone, serviceId, date, ignoreLeadTime, excludeBookingId }: SlotOptions): Promise<Slot[]> {
  if (!isValidDate(date)) return [];
  const [service, availability] = await Promise.all([
    prisma.service.findFirst({ where: { id: serviceId, organizationId, active: true } }),
    prisma.weeklyAvailability.findUnique({ where: { organizationId_weekday: { organizationId, weekday: weekdayOf(date) } } })
  ]);
  if (!service || !availability) return [];

  const dayStart = zonedToUtc(date, "00:00", timezone);
  const dayEnd = zonedToUtc(addDays(date, 1), "00:00", timezone);
  const [bookings, exceptions] = await Promise.all([
    prisma.booking.findMany({ where: { organizationId, status: { not: "cancelled" }, id: excludeBookingId ? { not: excludeBookingId } : undefined, startsAt: { lt: dayEnd }, endsAt: { gt: dayStart } }, select: { startsAt: true, endsAt: true } }),
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

export type BookingInput = { organizationId: string; timezone: string; serviceId: string; startsAt: string; customerName: string; customerPhone: string; customerEmail?: string; notes?: string; fromPanel?: boolean };
export type BookingResult = { ok: true; bookingId: string } | { ok: false; error: string; status?: number };

async function checkSlot(input: { organizationId: string; timezone: string; serviceId: string; startsAt: string; fromPanel?: boolean; excludeBookingId?: string }): Promise<{ ok: true; startsAt: Date } | { ok: false; error: string; status: number }> {
  const startsAt = new Date(input.startsAt);
  if (Number.isNaN(startsAt.getTime())) return { ok: false, error: "Elige un horario.", status: 400 };
  const date = dateInZone(startsAt, input.timezone);
  if (!input.fromPanel && date > addDays(dateInZone(new Date(), input.timezone), BOOKING_WINDOW_DAYS)) return { ok: false, error: `Solo se puede reservar con hasta ${BOOKING_WINDOW_DAYS} días de anticipación.`, status: 400 };
  const slots = await getAvailableSlots({ organizationId: input.organizationId, timezone: input.timezone, serviceId: input.serviceId, date, ignoreLeadTime: input.fromPanel, excludeBookingId: input.excludeBookingId });
  if (!slots.some((slot) => slot.startsAt === startsAt.toISOString())) return { ok: false, error: `El horario de las ${formatTime(startsAt, input.timezone)} ya no está disponible. Elige otro.`, status: 409 };
  return { ok: true, startsAt };
}

const SLOT_TAKEN: BookingResult = { ok: false, error: "Ese horario se acaba de ocupar. Elige otro.", status: 409 };

export async function createBooking(input: BookingInput): Promise<BookingResult> {
  const customerName = input.customerName.trim().slice(0, 80);
  const customerPhone = normalizePhone(input.customerPhone);
  if (customerName.length < 2) return { ok: false, error: "Escribe el nombre del cliente.", status: 400 };
  if (customerPhone.replace(/\D/g, "").length < 7) return { ok: false, error: "Escribe un teléfono válido.", status: 400 };
  const slot = await checkSlot(input);
  if (!slot.ok) return slot;
  const { startsAt } = slot;

  try {
    const booking = await prisma.$transaction(async (tx) => {
      const service = await tx.service.findFirstOrThrow({ where: { id: input.serviceId, organizationId: input.organizationId } });
      const endsAt = new Date(startsAt.getTime() + service.durationMinutes * 60_000);
      const overlapping = await tx.booking.count({ where: { organizationId: input.organizationId, status: { not: "cancelled" }, startsAt: { lt: endsAt }, endsAt: { gt: startsAt } } });
      if (overlapping > 0) throw new Error("SLOT_TAKEN");
      return tx.booking.create({ data: { organizationId: input.organizationId, serviceId: service.id, customerName, customerPhone, customerEmail: (input.customerEmail ?? "").trim().slice(0, 120), notes: (input.notes ?? "").trim().slice(0, 300), startsAt, endsAt, priceInCents: service.priceInCents } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return { ok: true, bookingId: booking.id };
  } catch {
    return SLOT_TAKEN;
  }
}

export async function rescheduleBooking(input: { organizationId: string; timezone: string; bookingId: string; startsAt: string; serviceId?: string; fromPanel?: boolean }): Promise<BookingResult> {
  const booking = await prisma.booking.findFirst({ where: { id: input.bookingId, organizationId: input.organizationId } });
  if (!booking) return { ok: false, error: "No encontramos esa cita.", status: 404 };
  if (booking.status !== "confirmed") return { ok: false, error: "Esa cita ya no se puede reprogramar.", status: 409 };
  const serviceId = input.serviceId || booking.serviceId;
  const slot = await checkSlot({ ...input, serviceId, excludeBookingId: booking.id });
  if (!slot.ok) return slot;
  const { startsAt } = slot;

  try {
    await prisma.$transaction(async (tx) => {
      const service = await tx.service.findFirstOrThrow({ where: { id: serviceId, organizationId: input.organizationId } });
      const endsAt = new Date(startsAt.getTime() + service.durationMinutes * 60_000);
      const overlapping = await tx.booking.count({ where: { organizationId: input.organizationId, id: { not: booking.id }, status: { not: "cancelled" }, startsAt: { lt: endsAt }, endsAt: { gt: startsAt } } });
      if (overlapping > 0) throw new Error("SLOT_TAKEN");
      await tx.booking.update({ where: { id: booking.id }, data: { serviceId: service.id, startsAt, endsAt, priceInCents: service.priceInCents } });
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
  const [services, availability] = await Promise.all([
    prisma.service.findMany({ where: { organizationId: organization.id, active: true }, orderBy: { createdAt: "asc" } }),
    prisma.weeklyAvailability.findMany({ where: { organizationId: organization.id }, select: { weekday: true } })
  ]);
  const openDays = new Set(availability.map((day) => day.weekday));
  const shortFormat = (value: string, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("es-CO", { timeZone: "UTC", ...options }).format(new Date(`${value}T12:00:00Z`)).replace(".", "");
  return {
    services: services.map((service) => ({ id: service.id, name: service.name, description: service.description, duration: `${service.durationMinutes} min`, price: formatMoney(service.priceInCents, service.currency) })),
    dates: upcomingDates(organization.timezone).map((value) => ({ value, weekday: shortFormat(value, { weekday: "short" }), day: shortFormat(value, { day: "numeric" }), month: shortFormat(value, { month: "short" }), open: openDays.has(weekdayOf(value)) }))
  };
}
