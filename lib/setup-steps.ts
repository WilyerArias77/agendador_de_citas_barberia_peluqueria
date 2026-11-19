import type { Route } from "next";

// Pasos de la guía de configuración (mismo orden que el menú). Los pasos con `key` los marca el dueño
// como cumplidos desde la página de cada paso; los dos primeros se cumplen solos al crear y confirmar la cuenta.
export const SETUP_STEPS = [
  { title: "Crea tu cuenta", text: "Registraste tu nombre, correo y contraseña. Tu perfil quedó como Administrador." },
  { title: "Confirma tu correo", text: "Abriste el enlace que te enviamos por correo." },
  { key: "barberos", title: "Crea a tus barberos", text: "Agrega a cada barbero. Si tú también atiendes, regístrate como barbero.", href: "/panel/barberos", cta: "Ir a Barberos" },
  { key: "horario", title: "Define tu horario", text: "Los días y horas en que atiende tu negocio. Dejamos uno de ejemplo para que lo ajustes.", href: "/panel/disponibilidad", cta: "Ir a Horario" },
  { key: "servicios", title: "Define tus servicios y tarifas", text: "Nombre, duración y precio de cada servicio. Dejamos 3 de ejemplo.", href: "/panel/servicios", cta: "Ir a Servicios" },
  { key: "clientes", title: "Registra tus clientes", text: "Guárdalos para futuras comunicaciones, descuentos y novedades.", href: "/panel/clientes", cta: "Ir a Clientes" },
  { key: "agente", title: "Configura tu Agente de citas", text: "Conecta tu número de WhatsApp Business para que el agente atienda a tus clientes.", href: "/panel/whatsapp", cta: "Ir a Agente de citas" },
  { key: "reservas", title: "Registra las reservas que ya tienes", text: "Pasa a la agenda las citas que ya tenías apartadas.", href: "/panel/citas/nueva", cta: "Nueva cita" }
] as const satisfies readonly { key?: string; title: string; text: string; href?: Route; cta?: string }[];

export type SetupStepKey = Extract<(typeof SETUP_STEPS)[number], { key: string }>["key"];

export const SETUP_STEP_KEYS = SETUP_STEPS.flatMap((step) => ("key" in step ? [step.key] : [])) as SetupStepKey[];

export function isSetupStepKey(value: unknown): value is SetupStepKey {
  return typeof value === "string" && (SETUP_STEP_KEYS as string[]).includes(value);
}

// Un paso queda cumplido solo si el dueño lo marcó y todos los anteriores también lo están.
export function setupState(completed: readonly string[]) {
  const marked = SETUP_STEPS.map((step) => !("key" in step) || completed.includes(step.key));
  const firstPending = marked.indexOf(false);
  const steps = SETUP_STEPS.map((step, index) => ({ ...step, number: index + 1, done: firstPending === -1 || index < firstPending }));
  return { steps, done: steps.filter((step) => step.done).length, next: firstPending };
}
