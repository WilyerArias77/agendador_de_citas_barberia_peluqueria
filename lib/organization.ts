import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Organization } from "@prisma/client";
import { auth } from "./auth";
import { prisma } from "./prisma";

export const TRIAL_DAYS = 7;

export async function getSession() {
  return auth.api.getSession({ headers: headers() });
}

export async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/acceso?redirectedFrom=/panel");
  return session;
}

export async function getUserOrganization(userId: string) {
  const membership = await prisma.organizationMember.findFirst({ where: { userId }, include: { organization: true }, orderBy: { createdAt: "asc" } });
  return membership?.organization ?? null;
}

export async function requireOrganization() {
  const session = await requireSession();
  const organization = await getUserOrganization(session.user.id);
  if (!organization) redirect("/bienvenida");
  return { session, organization };
}

// Para server actions del panel: exige negocio y plan vigente.
export async function requireActiveOrganization() {
  const context = await requireOrganization();
  if (!hasActiveAccess(context.organization)) redirect("/suscripcion");
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
