"use client";

import { useActionState } from "react";
import { SubmitButton } from "../../../components/action-form";
import { unlockOwner } from "./actions";

export function UnlockForm({ next }: { next: string }) {
  const [state, action] = useActionState(unlockOwner, {});
  return <form action={action} className="mt-5">
    <input type="hidden" name="next" value={next} />
    <label className="block text-sm font-medium">Clave del dueño
      <input name="key" type="password" required autoFocus autoComplete="current-password" className="mt-2 h-11 w-full rounded-[10px] border border-[var(--line)] bg-[var(--surface)] px-3 text-[15px] tracking-[.08em] outline-none focus:border-[var(--accent)]" />
    </label>
    {state.error && <p role="alert" className="mt-3 rounded border border-[var(--danger)]/40 bg-[var(--danger)]/10 p-3 text-sm text-[var(--danger)]">{state.error}</p>}
    <div className="mt-5"><SubmitButton label="Entrar" pendingLabel="Verificando…" /></div>
  </form>;
}
