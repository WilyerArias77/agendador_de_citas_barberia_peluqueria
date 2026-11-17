import Link from "next/link";
import { AuthLayout } from "../../components/auth-layout";
import { VerifyEmailNotice } from "../../components/verify-email-notice";
import { getSession, getUserOrganization } from "../../lib/organization";

export const metadata = { title: "Confirmación de correo" };

const buttonClass = "inline-flex h-11 w-full items-center justify-center rounded-[10px] bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--on-accent)]";

// Destino del enlace "Confirmar mi correo". Better Auth agrega ?error=... si el enlace no sirvió.
export default async function EmailConfirmedPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const session = await getSession();

  if (error && !session?.user.emailVerified) {
    const expired = error === "token_expired";
    return <AuthLayout eyebrow="Confirma tu correo" heroTitle="Un paso más y abres tu agenda.">
      <h2 className="display mt-10 text-[36px] leading-[1.1] lg:mt-0">{expired ? "El enlace venció." : "El enlace no es válido."}</h2>
      <p className="mt-4 text-[var(--ink-muted)]">{expired ? "Los enlaces de confirmación duran 24 horas." : "Puede que ya lo hayas usado o que esté incompleto."} {session ? "Pide uno nuevo aquí abajo." : "Entra con tu correo y contraseña para pedir uno nuevo."}</p>
      <div className="mt-8">{session ? <VerifyEmailNotice email={session.user.email} callbackURL="/correo-confirmado" /> : <Link href="/acceso" className={buttonClass}>Entrar</Link>}</div>
    </AuthLayout>;
  }

  const next = !session ? { href: "/acceso" as const, label: "Entrar a mi cuenta" }
    : (await getUserOrganization(session.user.id)) ? { href: "/panel" as const, label: "Ir a mi panel" }
      : { href: "/bienvenida" as const, label: "Configurar mi negocio" };

  return <AuthLayout eyebrow="Correo confirmado" heroTitle="Tu cuenta está lista.">
    <p className="eyebrow mt-10 lg:mt-0">{session ? `Hola, ${session.user.name.split(" ")[0]}` : "¡Listo!"}</p>
    <h2 className="display mt-3 text-[36px] leading-[1.1]">Correo confirmado.</h2>
    <p role="status" className="mt-4 rounded border border-[var(--success)]/40 bg-[var(--success)]/10 p-3 text-sm text-[var(--success)]">Tu correo quedó verificado correctamente.</p>
    <p className="mt-4 text-[var(--ink-muted)]">{session ? "Ya puedes continuar." : "Ahora entra con tu correo y contraseña."}</p>
    <div className="mt-8"><Link href={next.href} className={buttonClass}>{next.label}</Link></div>
  </AuthLayout>;
}
