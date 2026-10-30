"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { AuthLayout, authInputClass } from "../../components/auth-layout";
import { authClient } from "../../lib/auth-client";
import { authErrorMessage } from "../../lib/auth-errors";

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(null); setLoading(true);
    const form = new FormData(event.currentTarget);
    try {
      const result = await authClient.signUp.email({ name: String(form.get("name")).trim(), email: String(form.get("email")).trim(), password: String(form.get("password")) });
      if (result.error) { setError(authErrorMessage(result.error, "No pudimos crear la cuenta. Inténtalo de nuevo.")); return; }
      window.location.assign("/bienvenida");
    } catch {
      setError("No pudimos conectar con el servidor. Revisa tu conexión.");
    } finally { setLoading(false); }
  }

  return <AuthLayout eyebrow="Empieza sencillo" heroTitle="Tu espacio para hacer crecer el negocio.">
    <p className="eyebrow mt-10 lg:mt-0">14 días gratis · sin tarjeta</p>
    <h2 className="display mt-3 text-[40px] leading-[1.1]">Abre las puertas.</h2>
    <p className="mt-4 text-[var(--ink-muted)]">Crea tu cuenta y en dos minutos tendrás tu página de reservas.</p>
    <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
      <label className="block text-sm font-medium">Tu nombre<input name="name" type="text" autoComplete="name" minLength={2} maxLength={80} placeholder="Camilo Torres" className={authInputClass} required /></label>
      <label className="block text-sm font-medium">Correo electrónico<input name="email" type="email" autoComplete="email" placeholder="hola@tubarberia.com" className={authInputClass} required /></label>
      <label className="block text-sm font-medium">Contraseña<input name="password" type="password" autoComplete="new-password" minLength={8} placeholder="Mínimo 8 caracteres" className={authInputClass} required /></label>
      {error && <p role="alert" className="rounded border border-[var(--danger)]/40 bg-[var(--danger)]/10 p-3 text-sm text-[var(--danger)]">{error}</p>}
      <button className="h-11 w-full rounded-[10px] bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--on-accent)]" disabled={loading} type="submit">{loading ? "Creando…" : "Crear mi cuenta"}</button>
    </form>
    <p className="mt-8 text-center text-sm text-[var(--ink-muted)]">¿Ya tienes una cuenta? <Link href="/acceso" className="font-semibold text-[var(--accent)]">Entrar</Link></p>
  </AuthLayout>;
}
