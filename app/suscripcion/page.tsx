import { redirect } from "next/navigation";
import { AuthLayout } from "../../components/auth-layout";
import { SignOutButton } from "../../components/sign-out-button";
import { WhatsappButton } from "../../components/whatsapp-button";
import { hasActiveAccess, requireOrganization } from "../../lib/organization";

export const metadata = { title: "Activa tu plan" };

export default async function SubscriptionPage() {
  const { organization } = await requireOrganization();
  if (hasActiveAccess(organization)) redirect("/panel");
  const supportPhone = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ?? "";
  const expiredTrial = organization.subscriptionStatus === "trialing";

  return <AuthLayout eyebrow="Tu plan" heroTitle="Sigue llenando tu agenda sin perseguir clientes.">
    <p className="eyebrow mt-10 lg:mt-0">{organization.name}</p>
    <h2 className="display mt-3 text-[36px] leading-[1.1]">{expiredTrial ? "Tu prueba gratis terminó." : "Tu plan está inactivo."}</h2>
    <p className="mt-4 text-[var(--ink-muted)]">Tus datos, servicios y citas siguen guardados. Activa tu plan para volver a usar el panel y para que tus clientes puedan reservar de nuevo en tu página.</p>
    <div className="mt-8 rounded-[10px] border border-[var(--line)] bg-[var(--surface)] p-5">
      <p className="font-semibold">Plan Profesional</p>
      <p className="mt-1 text-[13px] text-[var(--ink-muted)]">Agenda ilimitada, página de reservas y botón de WhatsApp.</p>
      <p className="mt-3 text-[13px] text-[var(--ink-muted)]">El pago en línea estará disponible muy pronto. Por ahora, escríbenos para activar tu plan.</p>
    </div>
    <div className="mt-6 flex flex-col gap-3">
      {supportPhone && <WhatsappButton phone={supportPhone} variant="inline" label="Activar mi plan por WhatsApp" message={`Hola, quiero activar el plan de ${organization.name} (${organization.slug}).`} />}
      <SignOutButton className="h-11 rounded-[10px] border border-[var(--line)] px-4 text-sm font-semibold text-[var(--ink-muted)]" />
    </div>
  </AuthLayout>;
}
