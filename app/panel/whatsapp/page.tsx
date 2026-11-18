import Link from "next/link";
import { InlineAction } from "../../../components/action-form";
import { PageHeader, cardClass } from "../../../components/panel-ui";
import { WhatsAppConnect } from "../../../components/whatsapp-connect";
import { isVerifiedPlatformAdmin } from "../../../lib/billing";
import { requireOwnerOrganization, trialDaysLeft } from "../../../lib/organization";
import { prisma } from "../../../lib/prisma";
import { formatLongDate, formatTime } from "../../../lib/time";
import { isPaidPlan, whatsappNumberLimit } from "../../../lib/whatsapp-access";
import { HUMAN_TAKEOVER_HOURS, whatsappEmbeddedSignupConfig } from "../../../lib/whatsapp-cloud";
import { disconnectWhatsApp, resumeAllConversations, setWhatsAppAgentEnabled } from "../whatsapp-actions";

export const metadata = { title: "Agente de citas" };

const CONNECT_LABEL = "Conectar tu número de WhatsApp Business al “Asistente de reservas”";

// Solo el dueño (administrador del negocio) conecta y administra los números de WhatsApp de su barbería.
export default async function WhatsAppPage() {
  const { organization, session } = await requireOwnerOrganization();
  const [connections, pausedChats] = await Promise.all([
    prisma.whatsAppConnection.findMany({ where: { organizationId: organization.id }, orderBy: { createdAt: "asc" } }),
    prisma.whatsAppConversation.count({ where: { organizationId: organization.id, botPausedUntil: { gt: new Date() } } })
  ]);
  const paid = isPaidPlan(organization);
  const limit = whatsappNumberLimit(organization, isVerifiedPlatformAdmin(session.user));
  const daysLeft = trialDaysLeft(organization);
  const signup = whatsappEmbeddedSignupConfig();
  const tz = organization.timezone;

  return <main className="min-h-screen bg-[var(--surface-sunken)]">
    <PageHeader eyebrow="Paso 7 · Asistente de reservas" title="Agente de citas" />
    <div className="mx-auto max-w-3xl space-y-6 p-6 lg:p-8">
      {connections.length === 0 && <p role="status" className="rounded-[10px] border border-[var(--accent)] bg-[var(--accent-soft)] p-4 text-[15px] font-semibold">Para configurar su agente debe conectar su número de WhatsApp Business.</p>}
      <section className={`${cardClass} p-5`}>
        <h2 className="text-[18px] font-semibold">Números de WhatsApp de {organization.name}</h2>
        <p className="mt-1 text-[13px] text-[var(--ink-muted)]">El Agente de citas responde a tus clientes por WhatsApp las 24 horas: informa servicios, precios y horarios, y agenda, cambia o cancela citas en tu calendario. En tu página de reservas ya atiende desde el ícono del barbero, aunque no hayas conectado WhatsApp.</p>
        <p className="mt-3 rounded border border-[var(--line)] bg-[var(--surface)] p-3 text-[13px]">
          {paid ? `Tu plan permite conectar hasta ${limit} números.` : <>En la prueba gratis puedes conectar <b>1 número</b>{daysLeft !== null ? ` (${daysLeft === 1 ? "queda 1 día" : `quedan ${daysLeft} días`})` : ""}. Al terminar la prueba el número se desconecta automáticamente. <Link href="/suscripcion" className="font-semibold text-[var(--accent)] underline">Activa tu plan</Link> para mantenerlo y conectar hasta 3.</>}
        </p>

        {connections.length > 0 && <ol className="mt-5 space-y-4">{connections.map((connection, index) => <li key={connection.id} className="rounded-[10px] border border-[var(--line)] bg-[var(--surface)] p-4">
          <p className="text-[12px] font-semibold uppercase tracking-[.06em] text-[var(--accent)]">Número {index + 1}</p>
          <dl className="mt-2 grid gap-2 text-[13px] sm:grid-cols-2">
            <div><dt className="text-[var(--ink-muted)]">Número</dt><dd className="font-semibold">{connection.displayPhone || connection.phoneNumberId}</dd></div>
            <div><dt className="text-[var(--ink-muted)]">Nombre en WhatsApp</dt><dd className="font-semibold">{connection.verifiedName || "—"}</dd></div>
            <div><dt className="text-[var(--ink-muted)]">Estado</dt><dd className={`font-semibold ${connection.status === "active" ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>{connection.status === "active" ? (connection.agentEnabled ? "Asistente activo" : "Asistente en pausa") : "Requiere reconexión"}</dd></div>
            <div><dt className="text-[var(--ink-muted)]">Último mensaje</dt><dd>{connection.lastMessageAt ? `${formatLongDate(connection.lastMessageAt, tz)} · ${formatTime(connection.lastMessageAt, tz)}` : "Aún no hay mensajes"}</dd></div>
          </dl>
          {connection.status !== "active" && <p role="alert" className="mt-3 rounded border border-[var(--danger)]/40 bg-[var(--danger)]/10 p-3 text-sm text-[var(--danger)]">Meta rechazó el permiso de este número{connection.lastError ? ` (${connection.lastError})` : ""}. Desconéctalo y vuelve a conectarlo.</p>}
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-3">
            <InlineAction action={setWhatsAppAgentEnabled.bind(null, connection.id, !connection.agentEnabled)} label={connection.agentEnabled ? "Pausar asistente" : "Activar asistente"} className="text-[13px] font-semibold text-[var(--accent)]" />
            <InlineAction action={disconnectWhatsApp.bind(null, connection.id)} label="Desconectar" confirm="El asistente dejará de responder en este número. Tu número y tus chats siguen funcionando normalmente. ¿Continuar?" className="text-[13px] font-semibold text-[var(--danger)]" />
          </div>
        </li>)}</ol>}

        {connections.length > 0 && <p className="mt-4 text-[12px] text-[var(--ink-muted)]">Si respondes tú mismo a un cliente desde la app WhatsApp Business, el asistente se queda callado en ese chat durante {HUMAN_TAKEOVER_HOURS} horas para no interrumpirte.{pausedChats > 0 ? ` Ahora hay ${pausedChats === 1 ? "1 chat" : `${pausedChats} chats`} en tus manos.` : ""}</p>}
        {pausedChats > 0 && <div className="mt-2"><InlineAction action={resumeAllConversations} label="Devolver los chats al asistente" className="text-[13px] font-semibold text-[var(--accent)]" /></div>}

        <div className="mt-5 border-t border-[var(--line)] pt-5">
          {connections.length >= limit ? <p className="text-[13px] text-[var(--ink-muted)]">{paid ? `Ya conectaste los ${limit} números de tu plan. Desconecta uno para conectar otro.` : "Ya conectaste el número de tu prueba gratis."}</p>
            : signup ? <><p className="text-[13px] text-[var(--ink-muted)]">Se abrirá una ventana de Meta: entra con tu Facebook y escanea el código QR desde la app WhatsApp Business de tu celular. Conservas tu número y tus chats. Si Meta te ofrece agregar un método de pago, puedes elegir “Omitir”.</p>
              <WhatsAppConnect appId={signup.appId} configId={signup.configId} graphVersion={signup.graphVersion} label={connections.length ? `${CONNECT_LABEL} · número ${connections.length + 1}` : CONNECT_LABEL} /></>
            : <p className="text-[13px]">La conexión automática con WhatsApp se está habilitando. Escríbenos a soporte y te ayudamos a conectarlo.</p>}
        </div>
      </section>
    </div>
  </main>;
}
