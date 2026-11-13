import Link from "next/link";
import { ActionForm, InlineAction } from "../../../components/action-form";
import { CopyButton } from "../../../components/copy-button";
import { BusinessTabs, PageHeader, cardClass, fieldClass } from "../../../components/panel-ui";
import { WhatsappButton } from "../../../components/whatsapp-button";
import { WhatsAppConnect } from "../../../components/whatsapp-connect";
import { MONTHLY_PER_BARBER_IN_CENTS, isVerifiedPlatformAdmin } from "../../../lib/billing";
import { prisma } from "../../../lib/prisma";
import { formatLongDate, formatMoney, formatTime } from "../../../lib/time";
import { HUMAN_TAKEOVER_HOURS, whatsappEmbeddedSignupConfig } from "../../../lib/whatsapp-cloud";
import { publicBookingUrl, requireOwnerOrganization, trialDaysLeft } from "../../../lib/organization";
import { regenerateAgentKey, revokeAgentKey, updateBusiness } from "../actions";
import { disconnectWhatsApp, resumeAllConversations, setWhatsAppAgentEnabled } from "../whatsapp-actions";

export const metadata = { title: "Mi negocio" };

export default async function BusinessPage() {
  const { organization, session } = await requireOwnerOrganization();
  const [connection, pausedChats] = await Promise.all([
    prisma.whatsAppConnection.findUnique({ where: { organizationId: organization.id } }),
    prisma.whatsAppConversation.count({ where: { organizationId: organization.id, botPausedUntil: { gt: new Date() } } })
  ]);
  const assistantAllowed = organization.subscriptionStatus === "active" || isVerifiedPlatformAdmin(session.user);
  const signup = whatsappEmbeddedSignupConfig();
  const publicUrl = publicBookingUrl(organization.slug);
  const daysLeft = trialDaysLeft(organization);
  const apiBase = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/api/agent`;

  return <main className="min-h-screen bg-[var(--surface-sunken)]">
    <PageHeader eyebrow="Configuración" title="Mi negocio" />
    <div className="mx-auto max-w-3xl space-y-6 p-6 lg:p-8">
      <BusinessTabs active="datos" />
      <section className={`${cardClass} p-5`}>
        <h2 className="text-[18px] font-semibold">Datos del negocio</h2>
        <p className="mt-1 text-[13px] text-[var(--ink-muted)]">Así aparece tu negocio en tu página de reservas.</p>
        <ActionForm action={updateBusiness} submitLabel="Guardar cambios" className="mt-4">
          <div className="grid gap-4">
            <label className="block text-sm font-medium">Nombre del negocio<input name="name" required minLength={2} maxLength={80} defaultValue={organization.name} className={fieldClass} /></label>
            <label className="block text-sm font-medium">WhatsApp del negocio<input name="phone" type="tel" inputMode="tel" maxLength={20} defaultValue={organization.phone} placeholder="300 123 4567" className={fieldClass} /><span className="mt-1 block text-[12px] font-normal text-[var(--ink-muted)]">Tus clientes verán un botón verde para escribirte. Números de Colombia: escribe los 10 dígitos; de otro país, inclúyelo con el indicativo.</span></label>
            <label className="block text-sm font-medium">Dirección<input name="address" maxLength={160} defaultValue={organization.address} placeholder="Calle 10 # 43-20, Medellín" className={fieldClass} /></label>
            <label className="block text-sm font-medium">Enlace a tu propia Política de Tratamiento de Datos Personales (opcional)<input name="privacyPolicyUrl" type="url" maxLength={300} defaultValue={organization.privacyPolicyUrl} placeholder="https://tunegocio.com/politica-de-datos" className={fieldClass} /><span className="mt-1 block text-[12px] font-normal text-[var(--ink-muted)]">Si lo dejas vacío, tus clientes verán la <a href={`/b/${organization.slug}/politica-de-datos`} target="_blank" rel="noopener noreferrer" className="font-semibold text-[var(--accent)] underline">política por defecto</a>, que se genera con el nombre, la dirección y el WhatsApp de tu negocio. Revísala; si tienes una política propia, pega aquí su enlace.</span></label>
          </div>
        </ActionForm>
        {organization.phone && <div className="mt-5 border-t border-[var(--line)] pt-5"><p className="mb-3 text-[13px] text-[var(--ink-muted)]">Prueba tu botón:</p><WhatsappButton phone={organization.phone} variant="inline" label="Abrir mi WhatsApp" /></div>}
      </section>

      <section className={`${cardClass} p-5`}>
        <h2 className="text-[18px] font-semibold">Página de reservas</h2>
        <p className="mt-3 break-all rounded border border-[var(--line)] bg-[var(--surface)] p-3 text-[13px]">{publicUrl}</p>
        <div className="mt-4"><CopyButton value={publicUrl} /></div>
      </section>

      <section className={`${cardClass} p-5`}>
        <h2 className="text-[18px] font-semibold">Plan</h2>
        <p className="mt-2 text-sm">{organization.subscriptionStatus === "active" ? `Plan Profesional activo${organization.currentPeriodEnd ? ` hasta el ${formatLongDate(organization.currentPeriodEnd, organization.timezone).toLowerCase()}` : ""}.` : daysLeft !== null ? `Prueba gratis · ${daysLeft === 1 ? "queda 1 día" : `quedan ${daysLeft} días`}.` : "Plan inactivo."}</p>
        <p className="mt-1 text-[13px] text-[var(--ink-muted)]">{formatMoney(MONTHLY_PER_BARBER_IN_CENTS)} al mes por barbero (más la instalación, una sola vez), por transferencia a Nequi.</p>
        <Link href="/suscripcion" className="mt-4 inline-flex h-10 items-center rounded-[10px] bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--on-accent)]">{organization.subscriptionStatus === "active" ? "Renovar plan" : "Activar plan"}</Link>
      </section>

      <section className={`${cardClass} p-5`}>
        <h2 className="text-[18px] font-semibold">Asistente de WhatsApp</h2>
        <p className="mt-1 text-[13px] text-[var(--ink-muted)]">Un asistente con inteligencia artificial responde a tus clientes por WhatsApp las 24 horas: informa servicios, precios y horarios, y agenda, cambia o cancela citas en tu calendario.</p>
        {connection ? <div className="mt-4 space-y-4">
          <dl className="grid gap-2 rounded-[10px] border border-[var(--line)] bg-[var(--surface)] p-4 text-[13px] sm:grid-cols-2">
            <div><dt className="text-[var(--ink-muted)]">Número</dt><dd className="font-semibold">{connection.displayPhone || connection.phoneNumberId}</dd></div>
            <div><dt className="text-[var(--ink-muted)]">Nombre en WhatsApp</dt><dd className="font-semibold">{connection.verifiedName || "—"}</dd></div>
            <div><dt className="text-[var(--ink-muted)]">Estado</dt><dd className={`font-semibold ${connection.status === "active" ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>{connection.status === "active" ? (connection.agentEnabled ? "Asistente activo" : "Asistente en pausa") : "Requiere reconexión"}</dd></div>
            <div><dt className="text-[var(--ink-muted)]">Último mensaje</dt><dd>{connection.lastMessageAt ? `${formatLongDate(connection.lastMessageAt, organization.timezone)} · ${formatTime(connection.lastMessageAt, organization.timezone)}` : "Aún no hay mensajes"}</dd></div>
          </dl>
          {connection.status !== "active" && <p role="alert" className="rounded border border-[var(--danger)]/40 bg-[var(--danger)]/10 p-3 text-sm text-[var(--danger)]">Meta rechazó el permiso de tu número{connection.lastError ? ` (${connection.lastError})` : ""}. Desconecta y vuelve a conectar tu WhatsApp.</p>}
          <p className="text-[12px] text-[var(--ink-muted)]">Si respondes tú mismo a un cliente desde la app WhatsApp Business, el asistente se queda callado en ese chat durante {HUMAN_TAKEOVER_HOURS} horas para no interrumpirte.{pausedChats > 0 ? ` Ahora hay ${pausedChats === 1 ? "1 chat" : `${pausedChats} chats`} en tus manos.` : ""}</p>
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            <InlineAction action={setWhatsAppAgentEnabled.bind(null, !connection.agentEnabled)} label={connection.agentEnabled ? "Pausar asistente" : "Activar asistente"} className="text-[13px] font-semibold text-[var(--accent)]" />
            {pausedChats > 0 && <InlineAction action={resumeAllConversations} label="Devolver los chats al asistente" className="text-[13px] font-semibold text-[var(--accent)]" />}
            <InlineAction action={disconnectWhatsApp} label="Desconectar WhatsApp" confirm="El asistente dejará de responder en tu WhatsApp. Tu número y tus chats siguen funcionando normalmente. ¿Continuar?" className="text-[13px] font-semibold text-[var(--danger)]" />
          </div>
        </div> : !assistantAllowed ? <p className="mt-4 rounded border border-[var(--line)] bg-[var(--surface)] p-3 text-[13px]">El asistente de WhatsApp está incluido en el plan mensual activo. <Link href="/suscripcion" className="font-semibold text-[var(--accent)] underline">Activa tu plan</Link> para conectarlo.</p>
          : signup ? <WhatsAppConnect appId={signup.appId} configId={signup.configId} graphVersion={signup.graphVersion} />
          : <p className="mt-4 rounded border border-[var(--line)] bg-[var(--surface)] p-3 text-[13px]">La conexión automática con WhatsApp se está habilitando. Escríbenos a soporte y te ayudamos a conectarlo.</p>}

        <details className="mt-6 border-t border-[var(--line)] pt-4">
          <summary className="cursor-pointer text-[13px] font-semibold text-[var(--ink-muted)]">Integraciones avanzadas (API)</summary>
          <p className="mt-2 text-[13px] text-[var(--ink-muted)]">Solo si conectas un sistema propio. El asistente de WhatsApp de arriba no necesita esta llave.</p>
          <dl className="mt-4 space-y-2 text-[13px]">
            <div className="flex flex-wrap gap-2"><dt className="text-[var(--ink-muted)]">URL de la API:</dt><dd className="break-all font-mono">{apiBase}</dd></div>
            <div className="flex flex-wrap gap-2"><dt className="text-[var(--ink-muted)]">Llave actual:</dt><dd className="font-mono">{organization.agentApiKeyHint ?? "Ninguna"}</dd></div>
          </dl>
          <ActionForm action={regenerateAgentKey} submitLabel={organization.agentApiKeyHint ? "Generar nueva llave (reemplaza la actual)" : "Generar llave"} pendingLabel="Generando…" className="mt-2"><span /></ActionForm>
          {organization.agentApiKeyHint && <div className="mt-4"><InlineAction action={revokeAgentKey} label="Desactivar llave" confirm="Las integraciones que usen esta llave dejarán de funcionar. ¿Continuar?" className="text-[13px] font-semibold text-[var(--danger)]" /></div>}
        </details>
      </section>
    </div>
  </main>;
}
