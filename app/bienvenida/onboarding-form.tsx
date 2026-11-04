"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { authInputClass } from "../../components/auth-layout";
import { createOrganization } from "./actions";

function Submit() {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} className="h-11 w-full rounded-[10px] bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--on-accent)]">{pending ? "Creando tu espacio…" : "Crear mi negocio"}</button>;
}

export function OnboardingForm() {
  const [state, action] = useActionState(createOrganization, {});
  return <form action={action} className="mt-8 space-y-4">
    <label className="block text-sm font-medium">Nombre del negocio<input name="name" required minLength={2} maxLength={80} placeholder="Barbería El Parche" className={authInputClass} /></label>
    <label className="block text-sm font-medium">WhatsApp del negocio<input name="phone" type="tel" inputMode="tel" required minLength={10} maxLength={20} placeholder="300 123 4567" className={authInputClass} /><span className="mt-1 block text-[12px] font-normal text-[var(--ink-muted)]">Tus clientes verán un botón para escribirte. La prueba gratis es una sola por negocio.</span></label>
    <label className="block text-sm font-medium">Dirección (opcional)<input name="address" maxLength={160} placeholder="Calle 10 # 43-20, Medellín" className={authInputClass} /></label>
    <fieldset className="text-sm font-medium"><legend>Tipo de negocio</legend><div className="mt-2 grid grid-cols-2 gap-3">
      <label className="flex cursor-pointer items-center gap-2 rounded border border-[var(--line)] bg-[var(--surface)] px-4 py-3"><input type="radio" name="theme" value="barbershop" defaultChecked className="accent-[var(--accent)]" />Barbería</label>
      <label className="flex cursor-pointer items-center gap-2 rounded border border-[var(--line)] bg-[var(--surface)] px-4 py-3"><input type="radio" name="theme" value="beauty" className="accent-[var(--accent)]" />Salón de belleza</label>
    </div></fieldset>
    {state.error && <p role="alert" className="rounded border border-[var(--danger)]/40 bg-[var(--danger)]/10 p-3 text-sm text-[var(--danger)]">{state.error}</p>}
    <Submit />
  </form>;
}
