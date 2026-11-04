import { Prisma } from "@prisma/client";
import { normalizePhone } from "./booking";
import { prisma } from "./prisma";
import { isValidDate } from "./time";

// Registro de clientes: el mismo formulario desde el panel y desde la página pública de reservas.

export type CustomerResult = { error?: string; success?: string };

const field = (formData: FormData, key: string, max: number) => String(formData.get(key) ?? "").trim().slice(0, max);

function parseCustomer(formData: FormData) {
  const fullName = field(formData, "fullName", 80);
  const phone = normalizePhone(field(formData, "phone", 20));
  const email = field(formData, "email", 120).toLowerCase();
  const birthDate = field(formData, "birthDate", 10);
  if (fullName.length < 2) return { error: "Escribe el nombre completo." };
  if (phone.replace(/\D/g, "").length < 7) return { error: "Escribe un número de celular válido." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Escribe un correo electrónico válido." };
  if (!isValidDate(birthDate) || birthDate < "1900-01-01" || birthDate > new Date().toISOString().slice(0, 10)) return { error: "Escribe una fecha de nacimiento válida." };
  return { data: { fullName, phone, email, birthDate } };
}

// Solo el dueño modifica los datos de un cliente (la autorización de datos original se conserva).
export async function updateCustomerRecord(organizationId: string, customerId: string, formData: FormData): Promise<CustomerResult> {
  const parsed = parseCustomer(formData);
  if ("error" in parsed) return { error: parsed.error };
  try {
    const result = await prisma.customer.updateMany({ where: { id: customerId, organizationId }, data: parsed.data });
    if (result.count === 0) return { error: "No encontramos ese cliente." };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { error: "Ya existe otro cliente con ese celular." };
    throw error;
  }
  return { success: "Datos del cliente actualizados." };
}

export async function registerCustomer(organization: { id: string }, formData: FormData, meta: { source: "panel" | "public"; createdByUserId?: string }): Promise<CustomerResult> {
  const parsed = parseCustomer(formData);
  if ("error" in parsed) return { error: parsed.error };
  const { fullName, phone, email, birthDate } = parsed.data;
  if (formData.get("consent") !== "on") return { error: "Para registrarse se necesita la autorización de tratamiento de datos." };

  const publicSuccess = { success: "¡Listo! Quedaste registrado para recibir descuentos y novedades." };
  try {
    await prisma.customer.create({ data: { organizationId: organization.id, fullName, phone, email, birthDate, source: meta.source, consentAt: new Date(), createdByUserId: meta.createdByUserId ?? null } });
  } catch (error) {
    // En la página pública no se revela si ese celular ya estaba registrado.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return meta.source === "public" ? publicSuccess : { error: "Ya existe un cliente registrado con ese celular." };
    throw error;
  }
  return meta.source === "public" ? publicSuccess : { success: `Cliente "${fullName}" registrado.` };
}

// Si el negocio no publicó una política propia, se usa la política por defecto de su página.
export function policyUrlFor(organization: { slug: string; privacyPolicyUrl: string }) {
  return organization.privacyPolicyUrl || `/b/${organization.slug}/politica-de-datos`;
}

export function isValidPolicyUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}
