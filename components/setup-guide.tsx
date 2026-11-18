import Link from "next/link";
import type { Route } from "next";
import { cardClass } from "./panel-ui";

// Guía de configuración del negocio en 8 pasos (mismo orden que el menú principal).
export type SetupProgress = { barbers: number; hours: number; services: number; customers: number; whatsapp: number; bookings: number };

export function SetupGuide({ progress }: { progress: SetupProgress }) {
  const steps: { title: string; text: string; done: boolean; href?: Route; cta?: string }[] = [
    { title: "Crea tu cuenta", text: "Registraste tu nombre, correo y contraseña. Tu perfil quedó como Administrador.", done: true },
    { title: "Confirma tu correo", text: "Abriste el enlace que te enviamos por correo.", done: true },
    { title: "Crea a tus barberos", text: "Agrega a cada barbero. Si tú también atiendes, regístrate como barbero.", done: progress.barbers > 0, href: "/panel/barberos", cta: "Ir a Barberos" },
    { title: "Define tu horario", text: "Los días y horas en que atiende tu negocio. Dejamos uno de ejemplo para que lo ajustes.", done: progress.hours > 0, href: "/panel/disponibilidad", cta: "Ir a Horario" },
    { title: "Define tus servicios y tarifas", text: "Nombre, duración y precio de cada servicio. Dejamos 3 de ejemplo.", done: progress.services > 0, href: "/panel/servicios", cta: "Ir a Servicios" },
    { title: "Registra tus clientes", text: "Guárdalos para futuras comunicaciones, descuentos y novedades.", done: progress.customers > 0, href: "/panel/clientes", cta: "Ir a Clientes" },
    { title: "Configura tu Agente de citas", text: "Conecta tu número de WhatsApp Business para que el agente atienda a tus clientes.", done: progress.whatsapp > 0, href: "/panel/whatsapp", cta: "Ir a Agente de citas" },
    { title: "Registra las reservas que ya tienes", text: "Pasa a la agenda las citas que ya tenías apartadas.", done: progress.bookings > 0, href: "/panel/citas/nueva", cta: "Nueva cita" }
  ];
  const done = steps.filter((step) => step.done).length;
  const next = steps.findIndex((step) => !step.done);

  return <details open={done < steps.length} className={`${cardClass} p-5`}>
    <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3">
      <div><p className="eyebrow">Configura tu negocio paso a paso</p><h2 className="mt-1 text-[18px] font-semibold">{done === steps.length ? "¡Tu negocio está listo!" : `Vas en el paso ${next + 1} de ${steps.length}`}</h2></div>
      <span className="tabular rounded-full border border-[var(--line)] px-3 py-1 text-[13px] text-[var(--ink-muted)]">{done}/{steps.length} completos</span>
    </summary>
    <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[var(--surface)]"><div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${(done / steps.length) * 100}%` }} /></div>
    <ol className="mt-5 grid gap-3 md:grid-cols-2">{steps.map((step, index) => <li key={step.title} className={`flex gap-3 rounded-[10px] border p-4 ${index === next ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--line)]"}`}>
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${step.done ? "bg-[var(--success)]/20 text-[var(--success)]" : "bg-[var(--surface)] text-[var(--ink-muted)]"}`}>{step.done ? "✓" : index + 1}</span>
      <div className="min-w-0">
        <p className="text-[12px] font-semibold uppercase tracking-[.06em] text-[var(--ink-muted)]">Paso {index + 1}</p>
        <p className="font-semibold">{step.title}</p>
        <p className="mt-1 text-[13px] text-[var(--ink-muted)]">{step.text}</p>
        {step.href && <Link href={step.href} className="mt-2 inline-block text-[13px] font-semibold text-[var(--accent)]">{step.cta} →</Link>}
      </div>
    </li>)}</ol>
  </details>;
}
