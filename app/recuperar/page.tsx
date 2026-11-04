"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { AuthLayout, authInputClass } from "../../components/auth-layout";
import { authClient } from "../../lib/auth-client";
import { authErrorMessage } from "../../lib/auth-errors";

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(null); setLoading(true);
    const form = new FormData(event.currentTarget);
    try {
      const result = await authClient.requestPasswordReset({ email: String(form.get("email")).trim(), redirectTo: "/restablecer" });
      if (result.error) { setError(authErrorMessage(result.error, "No pudimos enviar el correo. Inténtalo de nuevo.")); return; }
      setSent(true);
    } catch {
      setError("No pudimos conectar con el servidor. Revisa tu conexión.");
    } finally { setLoading(false); }
  }

  return <AuthLayout eyebrow="Tu espacio de trabajo" heroTitle="Recupera el acceso a tu agenda.">
    <p className="eyebrow mt-10 lg:mt-0">Recuperar contraseña</p>
    <h2 className="display mt-3 text-[40px] leading-[1.1]">¿Olvidaste tu contraseña?</h2>
    {sent ? <div role="status" className="mt-8 rounded border border-[var(--success)]/40 bg-[var(--success)]/10 p-4 text-sm">Si ese correo tiene una cuenta, te enviamos un enlace para crear una nueva contraseña. Revisa tu bandeja de entrada y el spam. El enlace vence en 1 hora.</div>
      : <>
        <p className="mt-4 text-[var(--ink-muted)]">Escribe el correo de tu cuenta y te enviaremos un enlace para crear una nueva.</p>
        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium">Correo electrónico<input name="email" type="email" autoComplete="email" placeholder="hola@tubarberia.com" className={authInputClass} required /></label>
          {error && <p role="alert" className="rounded border border-[var(--danger)]/40 bg-[var(--danger)]/10 p-3 text-sm text-[var(--danger)]">{error}</p>}
          <button className="h-11 w-full rounded-[10px] bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--on-accent)]" type="submit" disabled={loading}>{loading ? "Enviando…" : "Enviar enlace"}</button>
        </form>
      </>}
    <p className="mt-8 text-center text-sm text-[var(--ink-muted)]"><Link href="/acceso" className="font-semibold text-[var(--accent)]">← Volver a entrar</Link></p>
  </AuthLayout>;
}
