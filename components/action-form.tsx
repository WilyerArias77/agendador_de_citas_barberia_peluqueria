"use client";

import { useEffect, useRef } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { ActionState } from "../app/panel/actions";

type Props = {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  submitLabel: string;
  pendingLabel?: string;
  className?: string;
  resetOnSuccess?: boolean;
  submitClassName?: string;
};

export function SubmitButton({ label, pendingLabel = "Guardando…", className }: { label: string; pendingLabel?: string; className?: string }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} className={className ?? "h-10 rounded-[10px] bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--on-accent)]"}>{pending ? pendingLabel : label}</button>;
}

export function ActionForm({ action, children, submitLabel, pendingLabel, className, resetOnSuccess, submitClassName }: Props) {
  const [state, formAction] = useActionState(action, {});
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => { if (resetOnSuccess && state.success) formRef.current?.reset(); }, [state, resetOnSuccess]);

  return <form ref={formRef} action={formAction} className={className}>
    {children}
    {state.apiKey && <div className="mt-4 rounded border border-[var(--accent)] bg-[var(--accent-soft)] p-4"><p className="text-[13px] font-semibold">Tu llave de API</p><code className="mt-2 block select-all break-all rounded bg-[var(--surface)] p-3 text-[13px]">{state.apiKey}</code></div>}
    {state.error && <p role="alert" className="mt-4 rounded border border-[var(--danger)]/40 bg-[var(--danger)]/10 p-3 text-sm text-[var(--danger)]">{state.error}</p>}
    {state.success && <p role="status" className="mt-4 rounded border border-[var(--success)]/40 bg-[var(--success)]/10 p-3 text-sm text-[var(--success)]">{state.success}</p>}
    <div className="mt-5"><SubmitButton label={submitLabel} pendingLabel={pendingLabel} className={submitClassName} /></div>
  </form>;
}

// Botón para server actions sin estado (cambiar estado, borrar…), con confirmación opcional.
export function InlineAction({ action, label, confirm, className }: { action: () => Promise<void>; label: string; confirm?: string; className?: string }) {
  return <form action={action} onSubmit={(event) => { if (confirm && !window.confirm(confirm)) event.preventDefault(); }}>
    <InlineSubmit label={label} className={className} />
  </form>;
}

function InlineSubmit({ label, className }: { label: string; className?: string }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} className={className ?? "text-[13px] font-semibold text-[var(--accent)]"}>{pending ? "…" : label}</button>;
}
