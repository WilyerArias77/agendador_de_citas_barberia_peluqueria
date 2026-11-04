import { redirect } from "next/navigation";
import { AuthLayout } from "../../components/auth-layout";
import { TRIAL_DAYS, getUserOrganization, requireSession } from "../../lib/organization";
import { VerifyEmailNotice } from "../../components/verify-email-notice";
import { OnboardingForm } from "./onboarding-form";

export const metadata = { title: "Configura tu negocio" };

export default async function WelcomePage() {
  const session = await requireSession();
  if (await getUserOrganization(session.user.id)) redirect("/panel");
  if (!session.user.emailVerified) return <AuthLayout eyebrow="Confirma tu correo" heroTitle="Un paso más y abres tu agenda.">
    <p className="eyebrow mt-10 lg:mt-0">Hola, {session.user.name.split(" ")[0]}</p>
    <h2 className="display mt-3 text-[36px] leading-[1.1]">Confirma tu correo.</h2>
    <p className="mt-4 text-[var(--ink-muted)]">Te enviamos un enlace a tu correo. Ábrelo para confirmar tu cuenta y luego configura tu negocio. Si no te llegó, revisa el spam o pide uno nuevo.</p>
    <div className="mt-8"><VerifyEmailNotice email={session.user.email} callbackURL="/bienvenida" /></div>
  </AuthLayout>;
  return <AuthLayout eyebrow="Último paso" heroTitle="Cuéntanos de tu negocio y abre tu agenda hoy.">
    <p className="eyebrow mt-10 lg:mt-0">Hola, {session.user.name.split(" ")[0]}</p>
    <h2 className="display mt-3 text-[36px] leading-[1.1]">Configura tu negocio.</h2>
    <p className="mt-4 text-[var(--ink-muted)]">Tienes {TRIAL_DAYS} días de prueba gratis. Dejamos listos un horario y unos servicios de ejemplo para que los ajustes a tu medida.</p>
    <OnboardingForm />
  </AuthLayout>;
}
