"use client";

import { useState } from "react";
import type { ActionState } from "../app/panel/actions";
import { ActionForm } from "./action-form";
import { fieldClass } from "./panel-ui";

type Props = {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  businessName: string;
  policyUrl: string;
  // Desde el panel lo diligencia el personal del negocio en nombre del cliente.
  internal?: boolean;
};

// Mismo formulario para el panel (Clientes) y la página pública de reservas.
export function CustomerForm({ action, businessName, policyUrl, internal }: Props) {
  if (!policyUrl) {
    return <p className="rounded border border-[var(--line)] bg-[var(--surface)] p-4 text-[13px] text-[var(--ink-muted)]">
      {internal ? "Para registrar clientes, el dueño del negocio debe publicar el enlace a su Política de Tratamiento de Datos Personales en Mi negocio." : `El registro estará disponible cuando ${businessName} publique su Política de Tratamiento de Datos Personales.`}
    </p>;
  }
  return <ActionForm action={action} submitLabel={internal ? "Registrar cliente" : "Registrarme"} pendingLabel="Registrando…" resetOnSuccess>
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="block text-sm font-medium sm:col-span-2">Nombre completo<input name="fullName" required minLength={2} maxLength={80} autoComplete={internal ? "off" : "name"} placeholder="Juan Pérez" className={fieldClass} /></label>
      <label className="block text-sm font-medium">Número de teléfono celular<input name="phone" required type="tel" inputMode="tel" minLength={7} maxLength={20} autoComplete={internal ? "off" : "tel"} placeholder="300 123 4567" className={fieldClass} /></label>
      <label className="block text-sm font-medium">Correo electrónico<input name="email" required type="email" maxLength={120} autoComplete={internal ? "off" : "email"} placeholder="correo@ejemplo.com" className={fieldClass} /></label>
      <label className="block text-sm font-medium">Fecha de nacimiento<input name="birthDate" required type="date" min="1900-01-01" max={new Date().toISOString().slice(0, 10)} className={fieldClass} /></label>
    </div>
    <div className="mt-5 rounded border border-[var(--line)] bg-[var(--surface)] p-4 text-[13px]">
      <p className="font-semibold">Tratamiento de datos personales</p>
      <a href={policyUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block font-semibold text-[var(--accent)] underline">Ver la Política de Tratamiento de Datos Personales de {businessName}</a>
      <label className="mt-3 flex items-start gap-3">
        <input name="consent" type="checkbox" required className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--accent)]" />
        <span className="text-[var(--ink-muted)]">{internal ? `El cliente autorizó a ${businessName} el tratamiento de sus datos personales conforme a su Política de Tratamiento de Datos Personales.` : `Autorizo a ${businessName} el tratamiento de mis datos personales conforme a su Política de Tratamiento de Datos Personales.`}</span>
      </label>
    </div>
  </ActionForm>;
}

// En la página pública el registro es opcional: un botón que despliega el formulario sin tocar la reserva.
export function CustomerSignup(props: Omit<Props, "internal">) {
  const [open, setOpen] = useState(false);
  return <div>
    <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="w-full rounded-[10px] border border-[var(--accent)] px-4 py-3 text-sm font-semibold text-[var(--accent)] transition hover:bg-[var(--accent-soft)]">
      Regístrate como cliente de la barbería &ldquo;{props.businessName}&rdquo; para futuros descuentos y/o novedades
    </button>
    {open && <div className="mt-4"><p className="mb-4 text-[12px] text-[var(--ink-muted)]">El registro es opcional: no es necesario para reservar.</p><CustomerForm {...props} /></div>}
  </div>;
}
