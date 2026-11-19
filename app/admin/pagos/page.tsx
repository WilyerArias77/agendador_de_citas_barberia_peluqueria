import Link from "next/link";
import { notFound } from "next/navigation";
import { InlineAction } from "../../../components/action-form";
import { PageHeader, cardClass } from "../../../components/panel-ui";
import { VerifyEmailNotice } from "../../../components/verify-email-notice";
import { WhatsappButton } from "../../../components/whatsapp-button";
import { MONTHLY_PER_BARBER_IN_CENTS, isPlatformAdmin, isVerifiedPlatformAdmin, setupFeeInCents } from "../../../lib/billing";
import { hasActiveAccess, requireSession } from "../../../lib/organization";
import { prisma } from "../../../lib/prisma";
import { requireOwnerUnlock } from "../../../lib/owner-key";
import { formatMoney } from "../../../lib/time";
import { activateManually, approvePayment, cancelApprovalCode, generateApprovalCode, markSetupPaid, rejectPayment } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pagos de suscripciones" };

const date = (value: Date) => new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(value);
const day = (value: Date | null) => value ? new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", day: "numeric", month: "short", year: "numeric" }).format(value) : "—";
const REVIEW_LABEL: Record<string, string> = { approved: "Aprobado", rejected: "Rechazado", cancelled: "Código anulado" };

export default async function AdminPaymentsPage() {
  const session = await requireSession();
  if (!isPlatformAdmin(session.user.email)) notFound();
  // El correo de administrador debe estar confirmado antes de dar acceso.
  if (!isVerifiedPlatformAdmin(session.user)) return <main className="flex min-h-screen items-center justify-center bg-[var(--surface-sunken)] p-6"><div className={`${cardClass} max-w-md p-8`}><p className="eyebrow">Administración</p><h1 className="mt-2 text-[22px] font-semibold">Confirma tu correo</h1><p className="mt-3 text-sm text-[var(--ink-muted)]">Por seguridad, el panel de pagos solo se abre cuando el correo de administrador está confirmado.</p><div className="mt-5"><VerifyEmailNotice email={session.user.email} callbackURL="/admin/pagos" /></div></div></main>;
  await requireOwnerUnlock(session.user.id, "/admin/pagos");
  const [pending, reviewed, organizations, codes] = await Promise.all([
    prisma.paymentReport.findMany({ where: { status: "pending" }, include: { organization: { include: { owner: { select: { email: true } } } } }, orderBy: { createdAt: "asc" } }),
    prisma.paymentReport.findMany({ where: { status: { not: "pending" } }, include: { organization: { select: { name: true } } }, orderBy: { reviewedAt: "desc" }, take: 20 }),
    prisma.organization.findMany({ include: { owner: { select: { email: true } }, _count: { select: { barbers: { where: { active: true } } } } }, orderBy: { createdAt: "desc" } }),
    prisma.paymentReport.findMany({ where: { status: "code_sent", codeExpiresAt: { gt: new Date() } } })
  ]);
  const codeByOrg = new Map(codes.map((code) => [code.organizationId, code]));
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  return <main className="min-h-screen bg-[var(--surface-sunken)]">
    <PageHeader eyebrow="Plataforma" title="Pagos de suscripciones" actions={<Link href="/panel" className="inline-flex h-10 items-center rounded-[10px] border border-[var(--line)] px-4 text-sm font-semibold">← Volver al menú principal</Link>} />
    <div className="mx-auto max-w-[1100px] space-y-6 p-6 lg:p-8">
      <section className={`${cardClass} p-5`}>
        <h2 className="font-semibold">Cómo aprobar un pago</h2>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-[13px] text-[var(--ink-muted)]">
          <li>El negocio te escribe a tu WhatsApp de soporte con la captura de la transferencia (no llega ningún correo).</li>
          <li>Revisa en tu Nequi que el dinero sí llegó y que el valor coincide con “Valor a pagar”.</li>
          <li>Busca el negocio abajo y pulsa <b>Generar código</b>.</li>
          <li>Pulsa <b>Enviar por WhatsApp</b> para mandarle el código de 5 dígitos.</li>
          <li>El negocio ingresa el código en “Activa tu plan” y queda activo por 1 mes. El código se usa una sola vez y vence en 7 días.</li>
        </ol>
      </section>

      {pending.length > 0 && <section className={`${cardClass} overflow-hidden`}>
        <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-3"><h2 className="font-semibold">Reportes anteriores por revisar</h2><span className="text-[13px] text-[var(--ink-muted)]">{pending.length}</span></div>
        {<div className="divide-y divide-[var(--line)]">{pending.map((report) => <div key={report.id} className="flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4">
            <div className="min-w-0 flex-1"><p className="font-semibold">{report.organization.name}</p><p className="mt-1 text-[13px] text-[var(--ink-muted)]">{report.organization.owner.email} · {report.organization.phone || "sin teléfono"}</p></div>
            <div className="text-[13px]"><p><span className="text-[var(--ink-muted)]">Pagó:</span> {report.payerName}</p><p><span className="text-[var(--ink-muted)]">Referencia:</span> <span className="font-mono">{report.reference}</span></p></div>
            <div className="text-right text-[13px]"><p className="tabular font-semibold text-[var(--accent)]">{formatMoney(report.amountInCents)}</p><p className="text-[var(--ink-muted)]">{report.barbers} barbero{report.barbers === 1 ? "" : "s"}{report.setupInCents > 0 ? ` · incluye instalación ${formatMoney(report.setupInCents)}` : ""}</p><p className="text-[var(--ink-muted)]">{date(report.createdAt)}</p></div>
            <div className="flex gap-4">
              <InlineAction action={approvePayment.bind(null, report.id)} label="Aprobar (+1 mes)" confirm={`¿Confirmaste en Nequi la transferencia de ${report.payerName} (ref. ${report.reference})?`} />
              <InlineAction action={rejectPayment.bind(null, report.id)} label="Rechazar" confirm="¿Rechazar este reporte de pago?" className="text-[13px] font-semibold text-[var(--danger)]" />
            </div>
          </div>)}</div>}
      </section>}

      <section className={`${cardClass} overflow-hidden`}>
        <div className="border-b border-[var(--line)] px-5 py-3"><h2 className="font-semibold">Negocios</h2><p className="text-[12px] text-[var(--ink-muted)]">“Sumar 1 mes” sirve para pagos que llegaron sin reporte en la app.</p></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[1200px] text-left text-sm">
          <thead className="text-[12px] uppercase tracking-[.06em] text-[var(--ink-muted)]"><tr className="border-b border-[var(--line)]"><th className="px-5 py-3 font-semibold">Negocio</th><th className="px-5 py-3 font-semibold">Estado</th><th className="px-5 py-3 font-semibold">Prueba hasta</th><th className="px-5 py-3 font-semibold">Pagado hasta</th><th className="px-5 py-3 font-semibold">Barberos</th><th className="px-5 py-3 font-semibold">Instalación</th><th className="px-5 py-3 font-semibold">Valor a pagar</th><th className="px-5 py-3 font-semibold">Código de aprobación</th><th className="px-5 py-3" /></tr></thead>
          <tbody className="divide-y divide-[var(--line)]">{organizations.map((organization) => {
            const active = hasActiveAccess(organization);
            const barbers = Math.max(1, organization._count.barbers);
            const amount = (organization.setupPaidAt ? 0 : setupFeeInCents(barbers)) + MONTHLY_PER_BARBER_IN_CENTS * barbers;
            const code = codeByOrg.get(organization.id);
            return <tr key={organization.id}>
              <td className="px-5 py-3"><p className="font-semibold">{organization.name}</p><p className="text-[12px] text-[var(--ink-muted)]">{organization.owner.email}</p></td>
              <td className={`px-5 py-3 font-semibold ${active ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>{active ? (organization.subscriptionStatus === "active" ? "Pagado" : "En prueba") : "Vencido"}</td>
              <td className="tabular px-5 py-3 text-[var(--ink-muted)]">{day(organization.trialEndsAt)}</td>
              <td className="tabular px-5 py-3 text-[var(--ink-muted)]">{day(organization.currentPeriodEnd)}</td>
              <td className="tabular px-5 py-3 text-[var(--ink-muted)]">{Math.max(1, organization._count.barbers)}</td>
              <td className="px-5 py-3 text-[13px]">{organization.setupPaidAt ? <span className="text-[var(--success)]">Pagada</span> : <InlineAction action={markSetupPaid.bind(null, organization.id)} label="Marcar pagada" confirm={`¿Marcar la instalación de ${organization.name} como pagada?`} className="text-[13px] font-semibold text-[var(--ink-muted)]" />}</td>
              <td className="tabular px-5 py-3 font-semibold text-[var(--accent)]">{formatMoney(amount)}</td>
              <td className="px-5 py-3 text-[13px]">{code ? <div className="space-y-2">
                <p><span className="tabular text-[20px] font-semibold tracking-[.2em]">{code.approvalCode}</span> <span className="text-[12px] text-[var(--ink-muted)]">vence {day(code.codeExpiresAt)}</span></p>
                {organization.phone && <WhatsappButton phone={organization.phone} variant="inline" label="Enviar por WhatsApp" message={`Hola ${organization.name}, confirmamos tu pago. Tu código de aprobación es ${code.approvalCode}. Ingrésalo en ${appUrl}/suscripcion (paso 4) para activar tu plan. ¡Gracias!`} />}
                <InlineAction action={cancelApprovalCode.bind(null, code.id)} label="Anular código" confirm="¿Anular este código? El negocio ya no podrá usarlo." className="block text-[12px] font-semibold text-[var(--danger)]" />
              </div> : <InlineAction action={generateApprovalCode.bind(null, organization.id)} label="Generar código" confirm={`¿Ya confirmaste en Nequi el pago de ${organization.name} por ${formatMoney(amount)}?`} />}</td>
              <td className="px-5 py-3 text-right"><InlineAction action={activateManually.bind(null, organization.id)} label="Sumar 1 mes" confirm={`¿Sumar un mes pagado a ${organization.name}?`} /></td>
            </tr>;
          })}</tbody>
        </table></div>
      </section>

      {reviewed.length > 0 && <section className={`${cardClass} overflow-hidden`}>
        <div className="border-b border-[var(--line)] px-5 py-3"><h2 className="font-semibold">Revisados recientemente</h2></div>
        <div className="divide-y divide-[var(--line)]">{reviewed.map((report) => <div key={report.id} className="flex flex-wrap justify-between gap-3 px-5 py-3 text-[13px]"><span className="font-semibold">{report.organization.name}</span><span className="text-[var(--ink-muted)]">{report.approvalCode ? `Código ${report.approvalCode} · ${formatMoney(report.amountInCents)}` : `${report.payerName} · ref. ${report.reference}`}</span><span className={report.status === "approved" ? "text-[var(--success)]" : "text-[var(--danger)]"}>{REVIEW_LABEL[report.status] ?? report.status}{report.reviewedAt ? ` · ${date(report.reviewedAt)}` : ""}</span></div>)}</div>
      </section>}
    </div>
  </main>;
}
