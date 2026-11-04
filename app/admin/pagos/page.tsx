import { notFound } from "next/navigation";
import { InlineAction } from "../../../components/action-form";
import { PageHeader, cardClass } from "../../../components/panel-ui";
import { VerifyEmailNotice } from "../../../components/verify-email-notice";
import { isPlatformAdmin, isVerifiedPlatformAdmin } from "../../../lib/billing";
import { hasActiveAccess, requireSession } from "../../../lib/organization";
import { prisma } from "../../../lib/prisma";
import { formatMoney } from "../../../lib/time";
import { activateManually, approvePayment, markSetupPaid, rejectPayment } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pagos de suscripciones" };

const date = (value: Date) => new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(value);
const day = (value: Date | null) => value ? new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", day: "numeric", month: "short", year: "numeric" }).format(value) : "—";
const REVIEW_LABEL: Record<string, string> = { approved: "Aprobado", rejected: "Rechazado" };

export default async function AdminPaymentsPage() {
  const session = await requireSession();
  if (!isPlatformAdmin(session.user.email)) notFound();
  // El correo de administrador debe estar confirmado antes de dar acceso.
  if (!isVerifiedPlatformAdmin(session.user)) return <main className="flex min-h-screen items-center justify-center bg-[var(--surface-sunken)] p-6"><div className={`${cardClass} max-w-md p-8`}><p className="eyebrow">Administración</p><h1 className="mt-2 text-[22px] font-semibold">Confirma tu correo</h1><p className="mt-3 text-sm text-[var(--ink-muted)]">Por seguridad, el panel de pagos solo se abre cuando el correo de administrador está confirmado.</p><div className="mt-5"><VerifyEmailNotice email={session.user.email} callbackURL="/admin/pagos" /></div></div></main>;
  const [pending, reviewed, organizations] = await Promise.all([
    prisma.paymentReport.findMany({ where: { status: "pending" }, include: { organization: { include: { owner: { select: { email: true } } } } }, orderBy: { createdAt: "asc" } }),
    prisma.paymentReport.findMany({ where: { status: { not: "pending" } }, include: { organization: { select: { name: true } } }, orderBy: { reviewedAt: "desc" }, take: 20 }),
    prisma.organization.findMany({ include: { owner: { select: { email: true } }, _count: { select: { barbers: { where: { active: true } } } } }, orderBy: { createdAt: "desc" } })
  ]);

  return <main className="min-h-screen bg-[var(--surface-sunken)]">
    <PageHeader eyebrow="Administración" title="Pagos de suscripciones" />
    <div className="mx-auto max-w-[1100px] space-y-6 p-6 lg:p-8">
      <section className={`${cardClass} overflow-hidden`}>
        <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-3"><h2 className="font-semibold">Pagos por revisar</h2><span className="text-[13px] text-[var(--ink-muted)]">{pending.length}</span></div>
        {pending.length === 0 ? <p className="p-5 text-[13px] text-[var(--ink-muted)]">No hay pagos pendientes.</p>
          : <div className="divide-y divide-[var(--line)]">{pending.map((report) => <div key={report.id} className="flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4">
            <div className="min-w-0 flex-1"><p className="font-semibold">{report.organization.name}</p><p className="mt-1 text-[13px] text-[var(--ink-muted)]">{report.organization.owner.email} · {report.organization.phone || "sin teléfono"}</p></div>
            <div className="text-[13px]"><p><span className="text-[var(--ink-muted)]">Pagó:</span> {report.payerName}</p><p><span className="text-[var(--ink-muted)]">Referencia:</span> <span className="font-mono">{report.reference}</span></p></div>
            <div className="text-right text-[13px]"><p className="tabular font-semibold text-[var(--accent)]">{formatMoney(report.amountInCents)}</p><p className="text-[var(--ink-muted)]">{report.barbers} barbero{report.barbers === 1 ? "" : "s"}{report.setupInCents > 0 ? ` · incluye instalación ${formatMoney(report.setupInCents)}` : ""}</p><p className="text-[var(--ink-muted)]">{date(report.createdAt)}</p></div>
            <div className="flex gap-4">
              <InlineAction action={approvePayment.bind(null, report.id)} label="Aprobar (+1 mes)" confirm={`¿Confirmaste en Nequi la transferencia de ${report.payerName} (ref. ${report.reference})?`} />
              <InlineAction action={rejectPayment.bind(null, report.id)} label="Rechazar" confirm="¿Rechazar este reporte de pago?" className="text-[13px] font-semibold text-[var(--danger)]" />
            </div>
          </div>)}</div>}
      </section>

      <section className={`${cardClass} overflow-hidden`}>
        <div className="border-b border-[var(--line)] px-5 py-3"><h2 className="font-semibold">Negocios</h2><p className="text-[12px] text-[var(--ink-muted)]">“Sumar 1 mes” sirve para pagos que llegaron sin reporte en la app.</p></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm">
          <thead className="text-[12px] uppercase tracking-[.06em] text-[var(--ink-muted)]"><tr className="border-b border-[var(--line)]"><th className="px-5 py-3 font-semibold">Negocio</th><th className="px-5 py-3 font-semibold">Estado</th><th className="px-5 py-3 font-semibold">Prueba hasta</th><th className="px-5 py-3 font-semibold">Pagado hasta</th><th className="px-5 py-3 font-semibold">Barberos</th><th className="px-5 py-3 font-semibold">Instalación</th><th className="px-5 py-3" /></tr></thead>
          <tbody className="divide-y divide-[var(--line)]">{organizations.map((organization) => {
            const active = hasActiveAccess(organization);
            return <tr key={organization.id}>
              <td className="px-5 py-3"><p className="font-semibold">{organization.name}</p><p className="text-[12px] text-[var(--ink-muted)]">{organization.owner.email}</p></td>
              <td className={`px-5 py-3 font-semibold ${active ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>{active ? (organization.subscriptionStatus === "active" ? "Pagado" : "En prueba") : "Vencido"}</td>
              <td className="tabular px-5 py-3 text-[var(--ink-muted)]">{day(organization.trialEndsAt)}</td>
              <td className="tabular px-5 py-3 text-[var(--ink-muted)]">{day(organization.currentPeriodEnd)}</td>
              <td className="tabular px-5 py-3 text-[var(--ink-muted)]">{Math.max(1, organization._count.barbers)}</td>
              <td className="px-5 py-3 text-[13px]">{organization.setupPaidAt ? <span className="text-[var(--success)]">Pagada</span> : <InlineAction action={markSetupPaid.bind(null, organization.id)} label="Marcar pagada" confirm={`¿Marcar la instalación de ${organization.name} como pagada?`} className="text-[13px] font-semibold text-[var(--ink-muted)]" />}</td>
              <td className="px-5 py-3 text-right"><InlineAction action={activateManually.bind(null, organization.id)} label="Sumar 1 mes" confirm={`¿Sumar un mes pagado a ${organization.name}?`} /></td>
            </tr>;
          })}</tbody>
        </table></div>
      </section>

      {reviewed.length > 0 && <section className={`${cardClass} overflow-hidden`}>
        <div className="border-b border-[var(--line)] px-5 py-3"><h2 className="font-semibold">Revisados recientemente</h2></div>
        <div className="divide-y divide-[var(--line)]">{reviewed.map((report) => <div key={report.id} className="flex flex-wrap justify-between gap-3 px-5 py-3 text-[13px]"><span className="font-semibold">{report.organization.name}</span><span className="text-[var(--ink-muted)]">{report.payerName} · ref. {report.reference}</span><span className={report.status === "approved" ? "text-[var(--success)]" : "text-[var(--danger)]"}>{REVIEW_LABEL[report.status] ?? report.status}{report.reviewedAt ? ` · ${date(report.reviewedAt)}` : ""}</span></div>)}</div>
      </section>}
    </div>
  </main>;
}
