"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { BookingFormState } from "../../components/booking-picker";
import { generateApiKey } from "../../lib/agent-api";
import { createBooking } from "../../lib/booking";
import { requireActiveOrganization } from "../../lib/organization";
import { prisma } from "../../lib/prisma";
import { addDays, isValidDate, isValidTime, toMinutes, zonedToUtc } from "../../lib/time";

export type ActionState = { error?: string; success?: string; apiKey?: string };

const text = (formData: FormData, key: string, max = 200) => String(formData.get(key) ?? "").trim().slice(0, max);

// ---------- Servicios ----------

function parseService(formData: FormData) {
  const name = text(formData, "name", 80);
  const description = text(formData, "description", 200);
  const durationMinutes = Number(formData.get("durationMinutes"));
  const price = Number(String(formData.get("price") ?? "").replace(/[^\d]/g, ""));
  if (name.length < 2) return { error: "Escribe el nombre del servicio." };
  if (!Number.isInteger(durationMinutes) || durationMinutes < 5 || durationMinutes > 480) return { error: "La duración debe estar entre 5 y 480 minutos." };
  if (!Number.isFinite(price) || price < 0 || price > 100_000_000) return { error: "Escribe un precio válido." };
  return { data: { name, description, durationMinutes, priceInCents: Math.round(price * 100) } };
}

export async function createService(_state: ActionState, formData: FormData): Promise<ActionState> {
  const { organization } = await requireActiveOrganization();
  const parsed = parseService(formData);
  if ("error" in parsed) return { error: parsed.error };
  await prisma.service.create({ data: { ...parsed.data, organizationId: organization.id } });
  revalidatePath("/panel/servicios");
  return { success: `Servicio "${parsed.data.name}" agregado.` };
}

export async function updateService(serviceId: string, _state: ActionState, formData: FormData): Promise<ActionState> {
  const { organization } = await requireActiveOrganization();
  const parsed = parseService(formData);
  if ("error" in parsed) return { error: parsed.error };
  const result = await prisma.service.updateMany({ where: { id: serviceId, organizationId: organization.id }, data: parsed.data });
  if (result.count === 0) return { error: "No encontramos ese servicio." };
  revalidatePath("/panel/servicios");
  return { success: "Cambios guardados." };
}

export async function toggleService(serviceId: string) {
  const { organization } = await requireActiveOrganization();
  const service = await prisma.service.findFirst({ where: { id: serviceId, organizationId: organization.id } });
  if (service) await prisma.service.update({ where: { id: service.id }, data: { active: !service.active } });
  revalidatePath("/panel/servicios");
}

export async function deleteService(serviceId: string) {
  const { organization } = await requireActiveOrganization();
  const service = await prisma.service.findFirst({ where: { id: serviceId, organizationId: organization.id }, include: { _count: { select: { bookings: true } } } });
  if (!service) return;
  // Con citas asociadas no se borra (se conserva el historial): se desactiva.
  if (service._count.bookings > 0) await prisma.service.update({ where: { id: service.id }, data: { active: false } });
  else await prisma.service.delete({ where: { id: service.id } });
  revalidatePath("/panel/servicios");
}

// ---------- Disponibilidad ----------

export async function saveAvailability(_state: ActionState, formData: FormData): Promise<ActionState> {
  const { organization } = await requireActiveOrganization();
  const days: { weekday: number; startsAt: string; endsAt: string; breakStartsAt: string | null; breakEndsAt: string | null }[] = [];
  for (let weekday = 0; weekday < 7; weekday++) {
    if (formData.get(`open-${weekday}`) !== "on") continue;
    const startsAt = text(formData, `start-${weekday}`, 5), endsAt = text(formData, `end-${weekday}`, 5);
    const breakStartsAt = text(formData, `breakStart-${weekday}`, 5), breakEndsAt = text(formData, `breakEnd-${weekday}`, 5);
    if (!isValidTime(startsAt) || !isValidTime(endsAt) || toMinutes(endsAt) <= toMinutes(startsAt)) return { error: "Revisa los horarios: la hora de cierre debe ser posterior a la de apertura." };
    const hasBreak = breakStartsAt !== "" || breakEndsAt !== "";
    if (hasBreak && (!isValidTime(breakStartsAt) || !isValidTime(breakEndsAt) || toMinutes(breakEndsAt) <= toMinutes(breakStartsAt) || toMinutes(breakStartsAt) < toMinutes(startsAt) || toMinutes(breakEndsAt) > toMinutes(endsAt))) return { error: "El descanso debe quedar dentro del horario del día." };
    days.push({ weekday, startsAt, endsAt, breakStartsAt: hasBreak ? breakStartsAt : null, breakEndsAt: hasBreak ? breakEndsAt : null });
  }
  await prisma.$transaction([
    prisma.weeklyAvailability.deleteMany({ where: { organizationId: organization.id } }),
    prisma.weeklyAvailability.createMany({ data: days.map((day) => ({ ...day, organizationId: organization.id })) })
  ]);
  revalidatePath("/panel/disponibilidad");
  return { success: "Horario guardado." };
}

export async function addException(_state: ActionState, formData: FormData): Promise<ActionState> {
  const { organization } = await requireActiveOrganization();
  const date = text(formData, "date", 10);
  const allDay = formData.get("allDay") === "on";
  const start = allDay ? "00:00" : text(formData, "start", 5);
  const end = allDay ? "00:00" : text(formData, "end", 5);
  if (!isValidDate(date)) return { error: "Elige una fecha." };
  if (!allDay && (!isValidTime(start) || !isValidTime(end) || toMinutes(end) <= toMinutes(start))) return { error: "Revisa las horas del bloqueo." };
  const startsAt = zonedToUtc(date, start, organization.timezone);
  const endsAt = allDay ? zonedToUtc(addDays(date, 1), "00:00", organization.timezone) : zonedToUtc(date, end, organization.timezone);
  await prisma.availabilityException.create({ data: { organizationId: organization.id, startsAt, endsAt, reason: text(formData, "reason", 120) } });
  revalidatePath("/panel/disponibilidad");
  return { success: "Bloqueo agregado. Esos horarios ya no se ofrecerán." };
}

export async function deleteException(exceptionId: string) {
  const { organization } = await requireActiveOrganization();
  await prisma.availabilityException.deleteMany({ where: { id: exceptionId, organizationId: organization.id } });
  revalidatePath("/panel/disponibilidad");
}

// ---------- Citas ----------

const BOOKING_STATUSES = ["confirmed", "completed", "cancelled", "no_show"] as const;

export async function setBookingStatus(bookingId: string, status: string) {
  const { organization } = await requireActiveOrganization();
  if (!(BOOKING_STATUSES as readonly string[]).includes(status)) return;
  await prisma.booking.updateMany({ where: { id: bookingId, organizationId: organization.id }, data: { status } });
  revalidatePath("/panel");
  revalidatePath("/panel/citas");
}

export async function createPanelBooking(_state: BookingFormState, formData: FormData): Promise<BookingFormState> {
  const { organization } = await requireActiveOrganization();
  const result = await createBooking({
    organizationId: organization.id,
    timezone: organization.timezone,
    serviceId: text(formData, "serviceId", 40),
    startsAt: text(formData, "startsAt", 40),
    customerName: text(formData, "customerName", 80),
    customerPhone: text(formData, "customerPhone", 20),
    notes: text(formData, "notes", 300),
    fromPanel: true
  });
  if (!result.ok) return { error: result.error };
  revalidatePath("/panel");
  redirect("/panel/citas?creada=1");
}

// ---------- Negocio ----------

export async function updateBusiness(_state: ActionState, formData: FormData): Promise<ActionState> {
  const { organization } = await requireActiveOrganization();
  const name = text(formData, "name", 80);
  if (name.length < 2) return { error: "Escribe el nombre del negocio." };
  const phone = text(formData, "phone", 20).replace(/[^\d+ ]/g, "");
  if (phone && phone.replace(/\D/g, "").length < 7) return { error: "El número de WhatsApp no parece válido." };
  await prisma.organization.update({ where: { id: organization.id }, data: { name, phone, address: text(formData, "address", 160) } });
  revalidatePath("/panel", "layout");
  return { success: "Datos del negocio guardados." };
}

export async function regenerateAgentKey(_state: ActionState, _formData: FormData): Promise<ActionState> {
  const { organization } = await requireActiveOrganization();
  const { key, hash, hint } = generateApiKey();
  await prisma.organization.update({ where: { id: organization.id }, data: { agentApiKeyHash: hash, agentApiKeyHint: hint } });
  revalidatePath("/panel/negocio");
  return { apiKey: key, success: "Llave creada. Cópiala ahora: por seguridad no la volveremos a mostrar." };
}

export async function revokeAgentKey() {
  const { organization } = await requireActiveOrganization();
  await prisma.organization.update({ where: { id: organization.id }, data: { agentApiKeyHash: null, agentApiKeyHint: null } });
  revalidatePath("/panel/negocio");
}
