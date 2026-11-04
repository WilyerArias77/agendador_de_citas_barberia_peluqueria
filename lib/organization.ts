import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Organization } from "@prisma/client";
import { auth } from "./auth";
import { prisma } from "./prisma";

export const TRIAL_DAYS = 7;

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/acceso?redirectedFrom=/panel");
  return session;
}

async function getMembership(userId: string) {
  return prisma.organizationMember.findFirst({ where: { userId }, include: { organization: true }, orderBy: { createdAt: "asc" } });
}

export async function getUserOrganization(userId: string) {
  return (await getMembership(userId))?.organization ?? null;
}

// role "barber": empleado con acceso propio; solo ve y gestiona sus citas y los clientes.
export async function requireOrganization() {
  const session = await requireSession();
  const membership = await getMembership(session.user.id);
  if (!membership) redirect("/bienvenida");
  const isBarber = membership.role === "barber";
  const barber = isBarber ? await prisma.barber.findFirst({ where: { userId: session.user.id, organizationId: membership.organizationId, active: true } }) : null;
  if (isBarber && !barber) redirect("/acceso?inactivo=1");
  return { session, organization: membership.organization, isOwner: !isBarber, barberId: barber?.id ?? null };
}

// Páginas solo para el dueño: los barberos vuelven al inicio.
export async function requireOwnerOrganization() {
  const context = await requireOrganization();
  if (!context.isOwner) redirect("/panel");
  return context;
}

// Para server actions del panel: exige negocio y plan vigente.
export async function requireActiveOrganization() {
  const context = await requireOrganization();
  if (!hasActiveAccess(context.organization)) redirect("/suscripcion");
  return context;
}

export async function requireActiveOwner() {
  const context = await requireActiveOrganization();
  if (!context.isOwner) redirect("/panel");
  return context;
}

export function hasActiveAccess(org: Pick<Organization, "subscriptionStatus" | "trialEndsAt" | "currentPeriodEnd">) {
  const now = Date.now();
  if (org.subscriptionStatus === "active") return !org.currentPeriodEnd || org.currentPeriodEnd.getTime() > now;
  if (org.subscriptionStatus === "trialing") return !!org.trialEndsAt && org.trialEndsAt.getTime() > now;
  return false;
}

export function trialDaysLeft(org: Pick<Organization, "subscriptionStatus" | "trialEndsAt">) {
  if (org.subscriptionStatus !== "trialing" || !org.trialEndsAt) return null;
  return Math.max(0, Math.ceil((org.trialEndsAt.getTime() - Date.now()) / 86_400_000));
}

// Días que le quedan a la mensualidad pagada; null si no está en plan pagado.
export function paidDaysLeft(org: Pick<Organization, "subscriptionStatus" | "currentPeriodEnd">) {
  if (org.subscriptionStatus !== "active" || !org.currentPeriodEnd) return null;
  return Math.max(0, Math.ceil((org.currentPeriodEnd.getTime() - Date.now()) / 86_400_000));
}

export function slugify(value: string) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) || "negocio";
}

export async function uniqueSlug(name: string) {
  const base = slugify(name);
  for (let attempt = 0; attempt < 20; attempt++) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
    if (!(await prisma.organization.findUnique({ where: { slug: candidate } }))) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export function publicBookingUrl(slug: string) {
  return `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/b/${slug}`;
}
