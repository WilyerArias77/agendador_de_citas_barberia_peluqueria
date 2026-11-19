import Link from "next/link";
import { notFound } from "next/navigation";
import { cardClass } from "../../../components/panel-ui";
import { isVerifiedPlatformAdmin } from "../../../lib/billing";
import { requireSession } from "../../../lib/organization";
import { ownerKeyConfigured } from "../../../lib/owner-key";
import { UnlockForm } from "./unlock-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Acceso del dueño" };

export default async function OwnerKeyPage(props: { searchParams: Promise<{ next?: string }> }) {
  const session = await requireSession();
  if (!isVerifiedPlatformAdmin(session.user)) notFound();
  const { next = "/admin/pagos" } = await props.searchParams;

  return <main className="flex min-h-screen items-center justify-center bg-[var(--surface-sunken)] p-6">
    <div className={`${cardClass} w-full max-w-md p-8`}>
      <p className="eyebrow">Dueño de la plataforma</p>
      <h1 className="mt-2 text-[22px] font-semibold">Ingresa tu clave</h1>
      <p className="mt-3 text-sm text-[var(--ink-muted)]">Los menús de Plataforma (pagos y WhatsApp de todos los negocios) piden tu clave única. El acceso dura 8 horas en este navegador.</p>
      {ownerKeyConfigured() ? <UnlockForm next={next} /> : <p role="alert" className="mt-5 rounded border border-[var(--danger)]/40 bg-[var(--danger)]/10 p-3 text-sm text-[var(--danger)]">La clave del dueño no está configurada en el servidor (PLATFORM_OWNER_KEY_HASH).</p>}
      <Link href="/panel" className="mt-6 inline-block text-sm font-semibold text-[var(--accent)]">← Volver al panel</Link>
    </div>
  </main>;
}
