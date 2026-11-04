"use server";

import { redirect } from "next/navigation";
import { TRIAL_DAYS, getUserOrganization, requireSession, uniqueSlug } from "../../lib/organization";
import { prisma } from "../../lib/prisma";

export type OnboardingState = { error?: string };

const DEFAULT_HOURS = [
  { weekday: 1, startsAt: "09:00", endsAt: "19:00" }, { weekday: 2, startsAt: "09:00", endsAt: "19:00" },
  { weekday: 3, startsAt: "09:00", endsAt: "19:00" }, { weekday: 4, startsAt: "09:00", endsAt: "19:00" },
  { weekday: 5, startsAt: "09:00", endsAt: "20:00" }, { weekday: 6, startsAt: "09:00", endsAt: "17:00" }
];

const STARTER_SERVICES = [
  { name: "Corte clásico", description: "Corte a tijera o máquina con acabado.", durationMinutes: 45, priceInCents: 3_000_000 },
  { name: "Barba", description: "Perfilado y arreglo de barba.", durationMinutes: 30, priceInCents: 2_000_000 },
  { name: "Corte + barba", description: "El servicio completo.", durationMinutes: 60, priceInCents: 4_500_000 }
];

const lastDigits = (value: string) => value.replace(/\D/g, "").slice(-10);
const normalized = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

// La prueba gratis es una sola por negocio: se reconoce por el WhatsApp o por el mismo nombre y dirección.
async function trialAlreadyUsed(phone: string, name: string, address: string) {
  const phoneKey = lastDigits(phone);
  const nameKey = normalized(name), addressKey = normalized(address);
  const others = await prisma.organization.findMany({ select: { phone: true, name: true, address: true } });
  return others.some((org) => (phoneKey.length >= 7 && lastDigits(org.phone) === phoneKey) || (addressKey.length > 0 && normalized(org.address) === addressKey && normalized(org.name) === nameKey));
}

export async function createOrganization(_state: OnboardingState, formData: FormData): Promise<OnboardingState> {
  const session = await requireSession();
  if (await getUserOrganization(session.user.id)) redirect("/panel");
  if (!session.user.emailVerified) return { error: "Primero confirma tu correo con el enlace que te enviamos." };

  const name = String(formData.get("name") ?? "").trim().slice(0, 80);
  const phone = String(formData.get("phone") ?? "").replace(/[^\d+ ]/g, "").trim().slice(0, 20);
  const address = String(formData.get("address") ?? "").trim().slice(0, 160);
  const theme = formData.get("theme") === "beauty" ? "beauty" : "barbershop";
  if (name.length < 2) return { error: "Escribe el nombre de tu negocio." };
  if (phone.replace(/\D/g, "").length < 10) return { error: "Escribe el WhatsApp del negocio (10 dígitos)." };
  const noTrial = await trialAlreadyUsed(phone, name, address);

  const slug = await uniqueSlug(name);
  await prisma.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: { name, slug, phone, address, theme, ownerId: session.user.id, subscriptionStatus: "trialing", trialEndsAt: new Date(Date.now() + (noTrial ? 0 : TRIAL_DAYS * 86_400_000)) }
    });
    await tx.organizationMember.create({ data: { organizationId: organization.id, userId: session.user.id, role: "owner" } });
    await tx.weeklyAvailability.createMany({ data: DEFAULT_HOURS.map((day) => ({ ...day, organizationId: organization.id })) });
    await tx.service.createMany({ data: STARTER_SERVICES.map((service) => ({ ...service, organizationId: organization.id })) });
  });
  redirect(noTrial ? "/suscripcion?sinPrueba=1" : "/panel?nuevo=1");
}
