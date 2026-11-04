"use client";

import { useState } from "react";
import { authClient } from "../lib/auth-client";
import { authErrorMessage } from "../lib/auth-errors";

// Reenvía el enlace de confirmación del correo de la cuenta.
export function VerifyEmailNotice({ email, callbackURL }: { email: string; callbackURL: string }) {
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  async function send() {
    setState("sending"); setError(null);
    try {
      const result = await authClient.sendVerificationEmail({ email, callbackURL });
      if (result.error) { setError(authErrorMessage(result.error, "No pudimos enviar el correo. Inténtalo de nuevo.")); setState("idle"); return; }
      setState("sent");
    } catch {
      setError("No pudimos conectar con el servidor. Revisa tu conexión."); setState("idle");
    }
  }

  return <div className="space-y-3 text-sm">
    <p>Enviaremos un enlace de confirmación a <span className="font-semibold">{email}</span>. Ábrelo desde este mismo navegador.</p>
    {state === "sent" ? <p role="status" className="rounded border border-[var(--success)]/40 bg-[var(--success)]/10 p-3 text-[var(--success)]">Te enviamos el enlace. Revisa tu bandeja de entrada y el spam.</p>
      : <button type="button" onClick={send} disabled={state === "sending"} className="h-11 w-full rounded-[10px] bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--on-accent)]">{state === "sending" ? "Enviando…" : "Enviar enlace de confirmación"}</button>}
    {error && <p role="alert" className="rounded border border-[var(--danger)]/40 bg-[var(--danger)]/10 p-3 text-[var(--danger)]">{error}</p>}
  </div>;
}
