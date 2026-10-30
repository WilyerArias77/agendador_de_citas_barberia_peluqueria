"use server";

import { redirect } from "next/navigation";
import type { BookingFormState } from "../../../components/booking-picker";
import { createBooking } from "../../../lib/booking";
import { hasActiveAccess } from "../../../lib/organization";
import { prisma } from "../../../lib/prisma";

export async function createPublicBooking(slug: string, _state: BookingFormState, formData: FormData): Promise<BookingFormState> {
  const organization = await prisma.organization.findUnique({ where: { slug } });
  if (!organization || !hasActiveAccess(organization)) return { error: "Este negocio no está recibiendo reservas en línea por ahora." };
  const result = await createBooking({
    organizationId: organization.id,
    timezone: organization.timezone,
    serviceId: String(formData.get("serviceId") ?? ""),
    startsAt: String(formData.get("startsAt") ?? ""),
    customerName: String(formData.get("customerName") ?? ""),
    customerPhone: String(formData.get("customerPhone") ?? ""),
    customerEmail: String(formData.get("customerEmail") ?? ""),
    notes: String(formData.get("notes") ?? "")
  });
  if (!result.ok) return { error: result.error };
  redirect(`/b/${slug}/confirmada?cita=${result.bookingId}`);
}
