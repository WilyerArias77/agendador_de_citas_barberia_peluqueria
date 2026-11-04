"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { AuthLayout, authInputClass } from "../../components/auth-layout";
import { authClient } from "../../lib/auth-client";
import { authErrorMessage } from "../../lib/auth-errors";

export function ResetPasswordForm({ token }: { token: string }) {
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(null);
    const form = new FormData(event.currentTarget);
    const newPassword = String(form.get("password"));
    if (newPassword !== String(form.get("confirm"))) { setError("Las contraseñas no coinciden."); return; }
    setLoading(true);
    try {
      const result = await authClient.resetPassword({ newPassword, token });
      if (result.error) { setError(authErrorMessage(result.error, "El enlace no es válido o ya venció. Pide uno nuevo.")); return; }
      setDone(true);
    } catch {
      setError("No pudimos conectar con el servidor. Revisa tu conexión.");
    } finally { setLoading(false); }
  }

  return <AuthLayout eyebrow="Tu espacio de trabajo" heroTitle="Recupera el acceso a tu agenda.">
    <p className="eyebrow mt-10 lg:mt-0">Nueva contraseña</p>
    <h2 className="display mt-3 text-[40px] leading-[1.1]">Crea tu nueva contraseña.</h2>
    {!token ? <div role="alert" className="mt-8 rounded border border-[var(--danger)]/40 bg-[var(--danger)]/10 p-4 text-sm">El enlace no es válido o ya venció. <Link href="/recuperar" className="font-semibold text-[var(--accent)]">Pide uno nuevo</Link>.</div>
      : done ? <div role="status" className="mt-8 rounded border border-[var(--success)]/40 bg-[var(--success)]/10 p-4 text-sm">¡Listo! Tu contraseña cambió y cerramos las sesiones abiertas. <Link href="/acceso" className="font-semibold text-[var(--accent)]">Entra con tu nueva contraseña →</Link></div>
      : <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
        <label className="block text-sm font-medium">Nueva contraseña<input name="password" type="password" autoComplete="new-password" minLength={8} maxLength={128} placeholder="Mínimo 8 caracteres" className={authInputClass} required /></label>
        <label className="block text-sm font-medium">Repite la contraseña<input name="confirm" type="password" autoComplete="new-password" minLength={8} maxLength={128} className={authInputClass} required /></label>
        {error && <p role="alert" className="rounded border border-[var(--danger)]/40 bg-[var(--danger)]/10 p-3 text-sm text-[var(--danger)]">{error}</p>}
        <button className="h-11 w-full rounded-[10px] bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--on-accent)]" type="submit" disabled={loading}>{loading ? "Guardando…" : "Guardar contraseña"}</button>
      </form>}
  </AuthLayout>;
}
