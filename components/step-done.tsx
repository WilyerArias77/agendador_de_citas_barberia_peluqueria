"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { completeSetupStep } from "../app/panel/setup-actions";
import type { SetupStepKey } from "../lib/setup-steps";
import { cardClass } from "./panel-ui";

function ContinueButton({ enabled }: { enabled: boolean }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={!enabled || pending} className="h-10 rounded-[10px] bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--on-accent)] disabled:cursor-not-allowed disabled:opacity-50">{pending ? "Guardando…" : "Continuar con el siguiente paso →"}</button>;
}

// Cierre de cada paso de la guía: casilla "tarea cumplida" + botón que lleva a los pasos pendientes.
export function StepDone({ step, number, title, done }: { step: SetupStepKey; number: number; title: string; done: boolean }) {
  const [checked, setChecked] = useState(done);
  return <form action={completeSetupStep} className={`${cardClass} border-[var(--accent)] p-5`}>
    <input type="hidden" name="step" value={step} />
    <p className="eyebrow">Paso {number} de la guía</p>
    <p className="mt-1 font-semibold">{title}</p>
    <label className="mt-3 flex cursor-pointer items-center gap-3 text-sm">
      <input type="checkbox" name="done" checked={checked} onChange={(event) => setChecked(event.target.checked)} className="h-5 w-5 accent-[var(--accent)]" />
      Ya terminé este paso
    </label>
    <div className="mt-4"><ContinueButton enabled={checked} /></div>
    {done && !checked && <p className="mt-2 text-[12px] text-[var(--ink-muted)]">Desmarcaste el paso: guarda para que vuelva a quedar pendiente.</p>}
    {done && !checked && <button type="submit" className="mt-2 text-[13px] font-semibold text-[var(--accent)]">Guardar como pendiente</button>}
  </form>;
}
