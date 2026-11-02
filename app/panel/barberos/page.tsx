import { ActionForm, InlineAction } from "../../../components/action-form";
import { PageHeader, cardClass, fieldClass } from "../../../components/panel-ui";
import { requireOwnerOrganization } from "../../../lib/organization";
import { prisma } from "../../../lib/prisma";
import { createBarber, giveBarberAccess, toggleBarber } from "../actions";

export const metadata = { title: "Barberos" };

function AccessFields() {
  return <div className="grid gap-4 sm:grid-cols-2">
    <label className="block text-sm font-medium">Correo de acceso<input name="email" type="email" maxLength={120} autoComplete="off" placeholder="barbero@correo.com" className={fieldClass} /></label>
    <label className="block text-sm font-medium">Contraseña<input name="password" type="password" minLength={8} maxLength={128} autoComplete="new-password" placeholder="Mínimo 8 caracteres" className={fieldClass} /></label>
  </div>;
}

export default async function BarbersPage() {
  const { organization } = await requireOwnerOrganization();
  const barbers = await prisma.barber.findMany({ where: { organizationId: organization.id }, orderBy: [{ active: "desc" }, { createdAt: "asc" }], include: { user: { select: { email: true } }, _count: { select: { bookings: { where: { status: "confirmed", startsAt: { gte: new Date() } } } } } } });

  return <main className="min-h-screen bg-[var(--surface-sunken)]">
    <PageHeader eyebrow="Equipo" title="Barberos" />
    <div className="mx-auto max-w-[1100px] space-y-6 p-6 lg:p-8">
      <section className={`${cardClass} p-5`}>
        <h2 className="text-[18px] font-semibold">Agregar barbero</h2>
        <p className="mt-1 text-[13px] text-[var(--ink-muted)]">Tus clientes elegirán primero al barbero al reservar. Si le das correo y contraseña, tendrá su propio perfil para agendar, reprogramar y cancelar sus citas, y registrar clientes.</p>
        <ActionForm action={createBarber} submitLabel="+ Agregar barbero" pendingLabel="Agregando…" resetOnSuccess className="mt-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium">Nombre<input name="name" required minLength={2} maxLength={80} placeholder="Andrés Gómez" className={fieldClass} /></label>
            <label className="block text-sm font-medium">Celular (opcional)<input name="phone" type="tel" inputMode="tel" maxLength={20} placeholder="300 123 4567" className={fieldClass} /></label>
          </div>
          <p className="mb-2 mt-5 text-[13px] font-semibold">Acceso al panel (opcional)</p>
          <AccessFields />
        </ActionForm>
      </section>

      <section className={`${cardClass} overflow-hidden`}>
        <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-3"><h2 className="font-semibold">Tu equipo</h2><span className="text-[13px] text-[var(--ink-muted)]">{barbers.filter((barber) => barber.active).length} activos</span></div>
        {barbers.length === 0 && <p className="p-5 text-[13px] text-[var(--ink-muted)]">Aún no tienes barberos. Mientras no agregues ninguno, las reservas funcionan como una sola agenda.</p>}
        <div className="divide-y divide-[var(--line)]">{barbers.map((barber) => <details key={barber.id} className="group">
          <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4">
            <div className="min-w-0 flex-1"><p className={`font-semibold ${barber.active ? "" : "text-[var(--ink-muted)] line-through"}`}>{barber.name}</p><p className="mt-1 text-[13px] text-[var(--ink-muted)]">{barber.user ? `Acceso: ${barber.user.email}` : "Sin acceso al panel"}{barber.phone ? ` · ${barber.phone}` : ""} · {barber._count.bookings} citas próximas</p></div>
            <span className={`text-[12px] font-semibold ${barber.active ? "text-[var(--success)]" : "text-[var(--ink-muted)]"}`}>{barber.active ? "Activo" : "Inactivo"}</span>
            <span className="text-[13px] font-semibold text-[var(--accent)] group-open:hidden">Gestionar</span>
          </summary>
          <div className="space-y-4 border-t border-[var(--line)] bg-[var(--surface)] px-5 py-5">
            {!barber.user && <ActionForm action={giveBarberAccess.bind(null, barber.id)} submitLabel="Crear acceso" pendingLabel="Creando…"><p className="mb-2 text-[13px] font-semibold">Dar acceso al panel</p><AccessFields /></ActionForm>}
            <InlineAction action={toggleBarber.bind(null, barber.id)} label={barber.active ? "Desactivar (no recibirá nuevas reservas ni podrá entrar)" : "Activar"} confirm={barber.active ? `¿Desactivar a ${barber.name}? Sus citas existentes se conservan.` : undefined} className={`text-[13px] font-semibold ${barber.active ? "text-[var(--danger)]" : "text-[var(--accent)]"}`} />
          </div>
        </details>)}</div>
      </section>
    </div>
  </main>;
}
