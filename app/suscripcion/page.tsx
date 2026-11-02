import Link from "next/link";
import { redirect } from "next/navigation";
import { ActionForm } from "../../components/action-form";
import { AuthLayout, authInputClass } from "../../components/auth-layout";
import { CopyButton } from "../../components/copy-button";
import { SignOutButton } from "../../components/sign-out-button";
import { WhatsappButton } from "../../components/whatsapp-button";
import { NEQUI_NUMBER, PLAN_NAME, PLAN_PRICE_IN_CENTS, supportWhatsapp } from "../../lib/billing";
import { hasActiveAccess, requireOrganization, trialDaysLeft } from "../../lib/organization";
import { prisma } from "../../lib/prisma";
import { formatLongDate, formatMoney } from "../../lib/time";
import { reportPayment } from "./actions";

export const metadata = { title: "Activa tu plan" };

export default async function SubscriptionPage() {
  const { organization, isOwner } = await requireOrganization();
  if (!isOwner) redirect("/panel");
  const active = hasActiveAccess(organization);
  const daysLeft = trialDaysLeft(organization);
  const pending = await prisma.paymentReport.findFirst({ where: { organizationId: organization.id, status: "pending" }, orderBy: { createdAt: "desc" } });
  const price = formatMoney(PLAN_PRICE_IN_CENTS);
  const tz = organization.timezone;

  const title = organization.subscriptionStatus === "active" && active ? "Tu plan está activo."
    : active && daysLeft !== null ? `Estás en tu prueba gratis: ${daysLeft === 1 ? "queda 1 día" : `quedan ${daysLeft} días`}.`
    : organization.subscriptionStatus === "trialing" ? "Tu prueba gratis terminó."
    : organization.currentPeriodEnd ? `Tu mensualidad venció el ${formatLongDate(organization.currentPeriodEnd, tz).toLowerCase()}.` : "Tu plan está inactivo.";
  const status = organization.subscriptionStatus === "active" && active && organization.currentPeriodEnd ? `Vigente hasta el ${formatLongDate(organization.currentPeriodEnd, tz).toLowerCase()}. Puedes pagar por adelantado: el mes se suma al final de tu periodo.`
    : active ? "Si pagas ahora, el mes empieza a contar cuando termine tu prueba gratis."
    : organization.subscriptionStatus === "active" ? "Agrega tu nuevo pago para renovarla. Tus datos, servicios y citas siguen guardados; al aprobar el pago vuelves a usar el panel y tus clientes pueden reservar de nuevo."
    : "Tus datos, servicios y citas siguen guardados. Activa tu plan para volver a usar el panel y para que tus clientes puedan reservar de nuevo en tu página.";

  return <AuthLayout eyebrow="Tu plan" heroTitle="Sigue llenando tu agenda sin perseguir clientes.">
    <p className="eyebrow mt-10 lg:mt-0">{organization.name}</p>
    <h2 className="display mt-3 text-[32px] leading-[1.1]">{title}</h2>
    <p className="mt-4 text-[var(--ink-muted)]">{status}</p>

    <div className="mt-8 rounded-[10px] border border-[var(--line)] bg-[var(--surface)] p-5">
      <div className="flex items-baseline justify-between gap-3"><p className="font-semibold">{PLAN_NAME}</p><p className="tabular text-[20px] font-semibold text-[var(--accent)]">{price}<span className="text-[13px] font-normal text-[var(--ink-muted)]"> / mes</span></p></div>
      <p className="mt-1 text-[13px] text-[var(--ink-muted)]">Agenda ilimitada, barberos, clientes, tablero contable y página de reservas.</p>
    </div>

    <ol className="mt-6 space-y-4 text-sm">
      <li><p className="font-semibold">1. Transfiere {price} a Nequi</p>
        <div className="mt-2 flex flex-wrap items-center gap-3 rounded-[10px] border border-[var(--line)] bg-[var(--surface)] p-3"><span className="tabular text-[20px] font-semibold tracking-[.04em]">{NEQUI_NUMBER}</span><CopyButton value={NEQUI_NUMBER} label="Copiar número" /></div></li>
      <li><p className="font-semibold">2. Reporta tu pago</p>
        {pending ? <p role="status" className="mt-2 rounded border border-[var(--accent)] bg-[var(--accent-soft)] p-3 text-[13px]">Tu pago (referencia {pending.reference}) está en revisión. Te avisaremos cuando lo confirmemos.</p>
          : <ActionForm action={reportPayment} submitLabel="Reportar pago" pendingLabel="Enviando…" submitClassName="h-11 w-full rounded-[10px] bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--on-accent)]">
            <label className="mt-2 block text-sm font-medium">Nombre de quien transfirió<input name="payerName" required minLength={2} maxLength={80} placeholder="Como aparece en Nequi" className={authInputClass} /></label>
            <label className="mt-4 block text-sm font-medium">Referencia de la transferencia<input name="reference" required minLength={4} maxLength={60} placeholder="Ej. M1234567" className={authInputClass} /></label>
          </ActionForm>}</li>
      <li><p className="font-semibold">3. Envíanos el comprobante</p>
        <div className="mt-2"><WhatsappButton phone={supportWhatsapp()} variant="inline" label="Enviar comprobante por WhatsApp" message={`Hola, pagué el ${PLAN_NAME} (${price}) de ${organization.name} (${organization.slug}). Adjunto el comprobante.`} /></div></li>
    </ol>
    <p className="mt-4 text-[12px] text-[var(--ink-muted)]">Activamos tu plan apenas confirmemos la transferencia.</p>

    <div className="mt-8 flex flex-col gap-3 border-t border-[var(--line)] pt-6">
      {active ? <Link href="/panel" className="flex h-11 items-center justify-center rounded-[10px] border border-[var(--line)] px-4 text-sm font-semibold">← Volver al panel</Link>
        : <SignOutButton className="h-11 rounded-[10px] border border-[var(--line)] px-4 text-sm font-semibold text-[var(--ink-muted)]" />}
    </div>
  </AuthLayout>;
}
