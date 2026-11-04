"use server";

import { redirect } from "next/navigation";
import type { BookingFormState } from "../../../components/booking-picker";
import { createBooking } from "../../../lib/booking";
import { type CustomerResult, registerCustomer } from "../../../lib/customers";
import { hasActiveAccess } from "../../../lib/organization";
import { prisma } from "../../../lib/prisma";
import { clientIp, isRateLimited } from "../../../lib/rate-limit";

export async function createPublicBooking(slug: string, _state: BookingFormState, formData: FormData): Promise<BookingFormState> {
  const organization = await prisma.organization.findUnique({ where: { slug } });
  if (!organization || !hasActiveAccess(organization)) return { error: "Este negocio no está recibiendo reservas en línea por ahora." };
  if (await isRateLimited(`booking:${await clientIp()}`, 5, 600)) return { error: "Hiciste demasiadas reservas seguidas. Espera unos minutos o escríbele al negocio por WhatsApp." };
  const result = await createBooking({
    organizationId: organization.id,
    timezone: organization.timezone,
    serviceId: String(formData.get("serviceId") ?? ""),
    barberId: String(formData.get("barberId") ?? "") || undefined,
    startsAt: String(formData.get("startsAt") ?? ""),
    customerName: String(formData.get("customerName") ?? ""),
    customerPhone: String(formData.get("customerPhone") ?? ""),
    customerEmail: String(formData.get("customerEmail") ?? ""),
    notes: String(formData.get("notes") ?? "")
  });
  if (!result.ok) return { error: result.error };
  redirect(`/b/${slug}/confirmada?cita=${result.bookingId}`);
}

// Registro opcional de clientes desde la página pública; no interviene en la reserva.
export async function registerPublicCustomer(slug: string, _state: CustomerResult, formData: FormData): Promise<CustomerResult> {
  const organization = await prisma.organization.findUnique({ where: { slug } });
  if (!organization || !hasActiveAccess(organization)) return { error: "Este negocio no está recibiendo registros por ahora." };
  if (await isRateLimited(`customer:${await clientIp()}`, 5, 600)) return { error: "Hiciste demasiados registros seguidos. Espera unos minutos." };
  return registerCustomer(organization, formData, { source: "public" });
}
