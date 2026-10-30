"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { AuthLayout, authInputClass } from "../../components/auth-layout";
import { authClient } from "../../lib/auth-client";
import { authErrorMessage } from "../../lib/auth-errors";

export default function AccessPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(null); setLoading(true);
    const form = new FormData(event.currentTarget);
    try {
      const result = await authClient.signIn.email({ email: String(form.get("email")).trim(), password: String(form.get("password")) });
      if (result.error) { setError(authErrorMessage(result.error, "No pudimos iniciar sesión. Inténtalo de nuevo.")); return; }
      window.location.assign("/panel");
    } catch {
      setError("No pudimos conectar con el servidor. Revisa tu conexión.");
    } finally { setLoading(false); }
  }

  return <AuthLayout eyebrow="Tu espacio de trabajo" heroTitle="Una agenda clara cambia el ritmo del negocio.">
    <p className="eyebrow mt-10 lg:mt-0">Acceso profesional</p>
    <h2 className="display mt-3 text-[40px] leading-[1.1]">Bienvenido de vuelta.</h2>
    <p className="mt-4 text-[var(--ink-muted)]">Revisa tu agenda y cuida cada reserva.</p>
    <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
      <label className="block text-sm font-medium">Correo electrónico<input name="email" type="email" autoComplete="email" placeholder="hola@tubarberia.com" className={authInputClass} required /></label>
      <label className="block text-sm font-medium">Contraseña<input name="password" type="password" autoComplete="current-password" placeholder="••••••••" className={authInputClass} required /></label>
      {error && <p role="alert" className="rounded border border-[var(--danger)]/40 bg-[var(--danger)]/10 p-3 text-sm text-[var(--danger)]">{error}</p>}
      <button className="h-11 w-full rounded-[10px] bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--on-accent)]" type="submit" disabled={loading}>{loading ? "Entrando…" : "Entrar a mi agenda"}</button>
    </form>
    <p className="mt-8 text-center text-sm text-[var(--ink-muted)]">¿Aún no tienes cuenta? <Link href="/registro" className="font-semibold text-[var(--accent)]">Prueba gratis 7 días</Link></p>
  </AuthLayout>;
}
