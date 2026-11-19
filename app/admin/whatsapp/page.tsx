import Link from "next/link";
import { notFound } from "next/navigation";
import { InlineAction } from "../../../components/action-form";
import { PageHeader, cardClass } from "../../../components/panel-ui";
import { isVerifiedPlatformAdmin } from "../../../lib/billing";
import { hasActiveAccess, requireSession } from "../../../lib/organization";
import { prisma } from "../../../lib/prisma";
import { requireOwnerUnlock } from "../../../lib/owner-key";
import { isWhatsAppPlatformReady } from "../../../lib/whatsapp-cloud";
import { resetConnectionError, setConnectionAgent } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "WhatsApp de los negocios" };

const date = (value: Date | null) => value ? new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(value) : "—";

// Tablero de soporte: qué negocios tienen WhatsApp conectado, si el asistente responde y qué errores hay.
export default async function AdminWhatsAppPage() {
  const session = await requireSession();
  if (!isVerifiedPlatformAdmin(session.user)) notFound();
  await requireOwnerUnlock(session.user.id, "/admin/whatsapp");
  const since = new Date(Date.now() - 24 * 3_600_000);
  const [connections, inbound, outbound] = await Promise.all([
    prisma.whatsAppConnection.findMany({ include: { organization: { include: { owner: { select: { email: true } } } } }, orderBy: [{ status: "asc" }, { lastMessageAt: "desc" }] }),
    prisma.whatsAppMessage.count({ where: { direction: "in", createdAt: { gte: since } } }),
    prisma.whatsAppMessage.count({ where: { direction: "out", createdAt: { gte: since } } })
  ]);
  const withErrors = connections.filter((c) => c.status !== "active" || c.lastError).length;
  const stat = (label: string, value: string | number, alert = false) => <div className={`${cardClass} p-4`}><p className="text-[12px] text-[var(--ink-muted)]">{label}</p><p className={`tabular mt-1 text-[24px] font-semibold ${alert ? "text-[var(--danger)]" : ""}`}>{value}</p></div>;

  return <main className="min-h-screen bg-[var(--surface-sunken)]">
    <PageHeader eyebrow="Plataforma" title="WhatsApp de los negocios" actions={<Link href="/panel" className="inline-flex h-10 items-center rounded-[10px] border border-[var(--line)] px-4 text-sm font-semibold">← Volver al menú principal</Link>} />
    <div className="mx-auto max-w-[1100px] space-y-6 p-6 lg:p-8">
      {!isWhatsAppPlatformReady() && <p role="alert" className="rounded border border-[var(--danger)]/40 bg-[var(--danger)]/10 p-3 text-sm text-[var(--danger)]">Faltan variables de entorno de WhatsApp en Vercel (META_APP_SECRET, NEXT_PUBLIC_META_APP_ID, WHATSAPP_ENCRYPTION_KEY, N8N_AGENT_WEBHOOK_URL o N8N_SHARED_SECRET).</p>}
      <div className="grid gap-4 sm:grid-cols-4">
        {stat("Negocios conectados", connections.length)}
        {stat("Con problemas", withErrors, withErrors > 0)}
        {stat("Mensajes recibidos (24 h)", inbound)}
        {stat("Respuestas enviadas (24 h)", outbound)}
      </div>
      <section className={`${cardClass} overflow-hidden`}>
        <div className="border-b border-[var(--line)] px-5 py-3"><h2 className="font-semibold">Conexiones</h2></div>
        {connections.length === 0 ? <p className="p-5 text-[13px] text-[var(--ink-muted)]">Ningún negocio ha conectado su WhatsApp todavía.</p>
          : <div className="divide-y divide-[var(--line)]">{connections.map((c) => <div key={c.id} className="flex flex-wrap items-start gap-x-6 gap-y-3 px-5 py-4">
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{c.organization.name}</p>
              <p className="mt-1 text-[13px] text-[var(--ink-muted)]">{c.organization.owner.email} · {c.displayPhone || c.phoneNumberId} · {c.mode === "coexistence" ? "App + API" : "Solo API"}</p>
              <p className="mt-1 font-mono text-[11px] text-[var(--ink-muted)]">WABA {c.wabaId} · Phone ID {c.phoneNumberId}</p>
              {c.lastError && <p className="mt-2 text-[12px] text-[var(--danger)]">Último error: {c.lastError}</p>}
            </div>
            <div className="text-[13px]">
              <p className={c.status === "active" ? "font-semibold text-[var(--success)]" : "font-semibold text-[var(--danger)]"}>{c.status === "active" ? (c.agentEnabled ? "Respondiendo" : "Pausado por el negocio") : "Token rechazado"}</p>
              <p className="text-[var(--ink-muted)]">Plan {hasActiveAccess(c.organization) ? "vigente" : "vencido"}</p>
              <p className="text-[var(--ink-muted)]">Último mensaje: {date(c.lastMessageAt)}</p>
            </div>
            <div className="flex flex-col gap-2">
              <InlineAction action={setConnectionAgent.bind(null, c.id, !c.agentEnabled)} label={c.agentEnabled ? "Pausar asistente" : "Activar asistente"} />
              {(c.status !== "active" || c.lastError) && <InlineAction action={resetConnectionError.bind(null, c.id)} label="Reintentar" />}
            </div>
          </div>)}</div>}
      </section>
    </div>
  </main>;
}
