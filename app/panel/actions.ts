"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { BookingFormState } from "../../components/booking-picker";
import { generateApiKey } from "../../lib/agent-api";
import { APIError } from "better-auth/api";
import { auth } from "../../lib/auth";
import { createBooking, normalizePhone, rescheduleBooking } from "../../lib/booking";
import { isValidPolicyUrl, registerCustomer, updateCustomerRecord } from "../../lib/customers";
import { isValidEmail, sendBookingEmail } from "../../lib/email";
import { requireActiveOrganization, requireActiveOwner } from "../../lib/organization";
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
  const { organization } = await requireActiveOwner();
  const parsed = parseService(formData);
  if ("error" in parsed) return { error: parsed.error };
  await prisma.service.create({ data: { ...parsed.data, organizationId: organization.id } });
  revalidatePath("/panel/servicios");
  return { success: `Servicio "${parsed.data.name}" agregado.` };
}

export async function updateService(serviceId: string, _state: ActionState, formData: FormData): Promise<ActionState> {
  const { organization } = await requireActiveOwner();
  const parsed = parseService(formData);
  if ("error" in parsed) return { error: parsed.error };
  const result = await prisma.service.updateMany({ where: { id: serviceId, organizationId: organization.id }, data: parsed.data });
  if (result.count === 0) return { error: "No encontramos ese servicio." };
  revalidatePath("/panel/servicios");
  return { success: "Cambios guardados." };
}

export async function toggleService(serviceId: string) {
  const { organization } = await requireActiveOwner();
  const service = await prisma.service.findFirst({ where: { id: serviceId, organizationId: organization.id } });
  if (service) await prisma.service.update({ where: { id: service.id }, data: { active: !service.active } });
  revalidatePath("/panel/servicios");
}

export async function deleteService(serviceId: string) {
  const { organization } = await requireActiveOwner();
  const service = await prisma.service.findFirst({ where: { id: serviceId, organizationId: organization.id }, include: { _count: { select: { bookings: true } } } });
  if (!service) return;
  // Con citas asociadas no se borra (se conserva el historial): se desactiva.
  if (service._count.bookings > 0) await prisma.service.update({ where: { id: service.id }, data: { active: false } });
  else await prisma.service.delete({ where: { id: service.id } });
  revalidatePath("/panel/servicios");
}

// ---------- Disponibilidad ----------

export async function saveAvailability(_state: ActionState, formData: FormData): Promise<ActionState> {
  const { organization } = await requireActiveOwner();
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
  const { organization } = await requireActiveOwner();
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
  const { organization } = await requireActiveOwner();
  await prisma.availabilityException.deleteMany({ where: { id: exceptionId, organizationId: organization.id } });
  revalidatePath("/panel/disponibilidad");
}

// ---------- Citas ----------

const BOOKING_STATUSES = ["confirmed", "completed", "cancelled", "no_show"] as const;

// Crear, reprogramar y cambiar el estado de las citas es solo del dueño (administrador).
export async function setBookingStatus(bookingId: string, status: string) {
  const { organization, barberId } = await requireActiveOwner();
  if (!(BOOKING_STATUSES as readonly string[]).includes(status)) return;
  const where = { id: bookingId, organizationId: organization.id, ...(barberId ? { barberId } : {}) };
  const previous = await prisma.booking.findFirst({ where, select: { status: true } });
  if (!previous) return;
  await prisma.booking.updateMany({ where, data: { status } });
  // Al cancelar una cita se avisa al cliente por correo.
  if (status === "cancelled" && previous.status !== "cancelled") await sendBookingEmail(bookingId, "cancelled");
  revalidatePath("/panel", "layout");
}

export async function reschedulePanelBooking(bookingId: string, _state: BookingFormState, formData: FormData): Promise<BookingFormState> {
  const { organization, barberId } = await requireActiveOwner();
  if (barberId && !(await prisma.booking.count({ where: { id: bookingId, organizationId: organization.id, barberId } }))) return { error: "No encontramos esa cita en tu agenda." };
  const result = await rescheduleBooking({
    organizationId: organization.id,
    timezone: organization.timezone,
    bookingId,
    serviceId: text(formData, "serviceId", 40) || undefined,
    barberId: barberId ?? (text(formData, "barberId", 40) || undefined),
    startsAt: text(formData, "startsAt", 40),
    fromPanel: true
  });
  if (!result.ok) return { error: result.error };
  await sendBookingEmail(bookingId, "rescheduled");
  revalidatePath("/panel", "layout");
  redirect("/panel/citas?reprogramada=1");
}

export async function createPanelBooking(_state: BookingFormState, formData: FormData): Promise<BookingFormState> {
  const { organization, barberId } = await requireActiveOwner();
  const customerEmail = text(formData, "customerEmail", 120).toLowerCase();
  if (customerEmail && !isValidEmail(customerEmail)) return { error: "Escribe un correo válido para el cliente." };
  const result = await createBooking({
    organizationId: organization.id,
    timezone: organization.timezone,
    serviceId: text(formData, "serviceId", 40),
    barberId: barberId ?? (text(formData, "barberId", 40) || undefined),
    startsAt: text(formData, "startsAt", 40),
    customerName: text(formData, "customerName", 80),
    customerPhone: text(formData, "customerPhone", 20),
    customerEmail,
    notes: text(formData, "notes", 300),
    fromPanel: true
  });
  if (!result.ok) return { error: result.error };
  await sendBookingEmail(result.bookingId, "created");
  revalidatePath("/panel", "layout");
  redirect("/panel/citas?creada=1");
}

// ---------- Negocio ----------

export async function updateBusiness(_state: ActionState, formData: FormData): Promise<ActionState> {
  const { organization } = await requireActiveOwner();
  const name = text(formData, "name", 80);
  if (name.length < 2) return { error: "Escribe el nombre del negocio." };
  const phone = text(formData, "phone", 20).replace(/[^\d+ ]/g, "");
  if (phone && phone.replace(/\D/g, "").length < 7) return { error: "El número de WhatsApp no parece válido." };
  const privacyPolicyUrl = text(formData, "privacyPolicyUrl", 300);
  if (privacyPolicyUrl && !isValidPolicyUrl(privacyPolicyUrl)) return { error: "El enlace de la política debe empezar por https://" };
  await prisma.organization.update({ where: { id: organization.id }, data: { name, phone, address: text(formData, "address", 160), privacyPolicyUrl } });
  revalidatePath("/panel", "layout");
  return { success: "Datos del negocio guardados." };
}

export async function regenerateAgentKey(_state: ActionState, _formData: FormData): Promise<ActionState> {
  const { organization } = await requireActiveOwner();
  const { key, hash, hint } = generateApiKey();
  await prisma.organization.update({ where: { id: organization.id }, data: { agentApiKeyHash: hash, agentApiKeyHint: hint } });
  revalidatePath("/panel/negocio");
  return { apiKey: key, success: "Llave creada. Cópiala ahora: por seguridad no la volveremos a mostrar." };
}

export async function revokeAgentKey() {
  const { organization } = await requireActiveOwner();
  await prisma.organization.update({ where: { id: organization.id }, data: { agentApiKeyHash: null, agentApiKeyHint: null } });
  revalidatePath("/panel/negocio");
}

// ---------- Barberos ----------

// Crea la cuenta con la que el barbero entra al panel con su propio perfil.
async function grantAccess(organizationId: string, barberId: string, name: string, formData: FormData): Promise<string | null> {
  const email = text(formData, "email", 120).toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email && !password) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Escribe un correo válido para el acceso del barbero.";
  if (password.length < 8 || password.length > 128) return "La contraseña del barbero debe tener al menos 8 caracteres.";
  if (await prisma.user.findUnique({ where: { email } })) return "Ese correo ya tiene una cuenta. Usa otro.";
  try {
    const { user } = await auth.api.signUpEmail({ body: { name, email, password } });
    await prisma.$transaction([
      prisma.organizationMember.create({ data: { organizationId, userId: user.id, role: "barber" } }),
      prisma.barber.update({ where: { id: barberId }, data: { userId: user.id } }),
      prisma.session.deleteMany({ where: { userId: user.id } })
    ]);
    return null;
  } catch (error) {
    return error instanceof APIError ? "No pudimos crear el acceso con ese correo." : "No pudimos crear el acceso. Inténtalo de nuevo.";
  }
}

export async function createBarber(_state: ActionState, formData: FormData): Promise<ActionState> {
  const { organization } = await requireActiveOwner();
  const name = text(formData, "name", 80);
  if (name.length < 2) return { error: "Escribe el nombre del barbero." };
  const barber = await prisma.barber.create({ data: { organizationId: organization.id, name, phone: normalizePhone(text(formData, "phone", 20)) } });
  const accessError = await grantAccess(organization.id, barber.id, name, formData);
  revalidatePath("/panel/barberos");
  if (accessError) return { error: `Barbero creado, pero sin acceso al panel: ${accessError}` };
  return { success: `Barbero "${name}" creado.` };
}

export async function giveBarberAccess(barberId: string, _state: ActionState, formData: FormData): Promise<ActionState> {
  const { organization } = await requireActiveOwner();
  const barber = await prisma.barber.findFirst({ where: { id: barberId, organizationId: organization.id } });
  if (!barber) return { error: "No encontramos ese barbero." };
  if (barber.userId) return { error: "Este barbero ya tiene acceso." };
  if (!text(formData, "email", 120)) return { error: "Escribe el correo del barbero." };
  const accessError = await grantAccess(organization.id, barber.id, barber.name, formData);
  if (accessError) return { error: accessError };
  revalidatePath("/panel/barberos");
  return { success: "Acceso creado. El barbero ya puede entrar con su correo y contraseña." };
}

export async function toggleBarber(barberId: string) {
  const { organization } = await requireActiveOwner();
  const barber = await prisma.barber.findFirst({ where: { id: barberId, organizationId: organization.id } });
  if (!barber) return;
  await prisma.barber.update({ where: { id: barber.id }, data: { active: !barber.active } });
  // Al desactivarlo se cierra su sesión.
  if (barber.active && barber.userId) await prisma.session.deleteMany({ where: { userId: barber.userId } });
  revalidatePath("/panel/barberos");
}

// ---------- Clientes ----------

// Los barberos pueden crear clientes; ver, modificar y eliminar sus datos es solo del dueño.
export async function createCustomer(_state: ActionState, formData: FormData): Promise<ActionState> {
  const { organization, session } = await requireActiveOrganization();
  const result = await registerCustomer(organization, formData, { source: "panel", createdByUserId: session.user.id });
  if (result.success) revalidatePath("/panel/clientes");
  return result;
}

// ---------- Gastos (solo dueño) ----------

export async function createExpense(_state: ActionState, formData: FormData): Promise<ActionState> {
  const { organization, session } = await requireActiveOwner();
  const date = text(formData, "date", 10);
  const description = text(formData, "description", 200);
  const quantity = Number(text(formData, "quantity", 20).replace(",", "."));
  const unitPrice = Number(text(formData, "unitPrice", 20).replace(/[^\d]/g, ""));
  const supplier = text(formData, "supplier", 120);
  const responsible = text(formData, "responsible", 120);
  if (!isValidDate(date)) return { error: "Elige la fecha del gasto." };
  if (description.length < 2) return { error: "Escribe la descripción del gasto." };
  if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 1_000_000) return { error: "La cantidad debe ser un número mayor que 0." };
  if (!Number.isInteger(unitPrice) || unitPrice <= 0) return { error: "El valor de la compra debe ser un número entero mayor que 0." };
  const total = Math.round(quantity * unitPrice);
  if (total > 2_000_000_000) return { error: "El total es demasiado alto. Revisa la cantidad y el valor." };
  if (supplier.length < 2) return { error: "Escribe el proveedor." };
  if (responsible.length < 2) return { error: "Escribe el responsable." };
  await prisma.expense.create({ data: { organizationId: organization.id, date, description, quantity: Math.round(quantity * 100) / 100, unitPrice, total, supplier, responsible, createdByUserId: session.user.id } });
  revalidatePath("/panel/negocio/gastos");
  return { success: `Gasto registrado: ${description}.` };
}

export async function deleteExpense(expenseId: string) {
  const { organization } = await requireActiveOwner();
  await prisma.expense.deleteMany({ where: { id: expenseId, organizationId: organization.id } });
  revalidatePath("/panel/negocio/gastos");
}

export async function updateCustomer(customerId: string, _state: ActionState, formData: FormData): Promise<ActionState> {
  const { organization } = await requireActiveOwner();
  const result = await updateCustomerRecord(organization.id, customerId, formData);
  if (result.success) revalidatePath("/panel/clientes");
  return result;
}

export async function deleteCustomer(customerId: string) {
  const { organization } = await requireActiveOwner();
  await prisma.customer.deleteMany({ where: { id: customerId, organizationId: organization.id } });
  revalidatePath("/panel/clientes");
}
