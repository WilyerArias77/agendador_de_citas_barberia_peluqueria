import { ActionForm, InlineAction } from "../../../components/action-form";
import { PageHeader, cardClass, fieldClass } from "../../../components/panel-ui";
import { requireOrganization } from "../../../lib/organization";
import { prisma } from "../../../lib/prisma";
import { formatMoney } from "../../../lib/time";
import { createService, deleteService, toggleService, updateService } from "../actions";

export const metadata = { title: "Servicios y tarifas" };

function ServiceFields({ defaults }: { defaults?: { name: string; description: string; durationMinutes: number; price: number } }) {
  return <div className="grid gap-4 sm:grid-cols-[1fr_130px_160px]">
    <label className="block text-sm font-medium">Nombre<input name="name" required minLength={2} maxLength={80} defaultValue={defaults?.name} placeholder="Corte clásico" className={fieldClass} /></label>
    <label className="block text-sm font-medium">Duración (min)<input name="durationMinutes" type="number" required min={5} max={480} step={5} defaultValue={defaults?.durationMinutes ?? 30} className={fieldClass} /></label>
    <label className="block text-sm font-medium">Precio (COP)<input name="price" type="number" required min={0} step={500} defaultValue={defaults?.price} placeholder="30000" className={fieldClass} /></label>
    <label className="block text-sm font-medium sm:col-span-3">Descripción (opcional)<input name="description" maxLength={200} defaultValue={defaults?.description} placeholder="Lo que incluye el servicio" className={fieldClass} /></label>
  </div>;
}

export default async function ServicesPage() {
  const { organization } = await requireOrganization();
  const services = await prisma.service.findMany({ where: { organizationId: organization.id }, orderBy: [{ active: "desc" }, { createdAt: "asc" }], include: { _count: { select: { bookings: true } } } });
  const activeCount = services.filter((service) => service.active).length;

  return <main className="min-h-screen bg-[var(--surface-sunken)]">
    <PageHeader eyebrow="Catálogo" title="Servicios y tarifas" />
    <div className="mx-auto max-w-[1100px] space-y-6 p-6 lg:p-8">
      <section className={`${cardClass} p-5`}>
        <h2 className="text-[18px] font-semibold">Agregar servicio</h2>
        <ActionForm action={createService} submitLabel="+ Agregar servicio" pendingLabel="Agregando…" resetOnSuccess className="mt-4"><ServiceFields /></ActionForm>
      </section>

      <section className={`${cardClass} overflow-hidden`}>
        <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-3"><h2 className="font-semibold">Tus servicios</h2><span className="text-[13px] text-[var(--ink-muted)]">{activeCount} activos</span></div>
        {services.length === 0 && <p className="p-5 text-[13px] text-[var(--ink-muted)]">Aún no tienes servicios. Agrega el primero arriba.</p>}
        <div className="divide-y divide-[var(--line)]">{services.map((service) => <details key={service.id} className="group">
          <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4">
            <div className="min-w-0 flex-1"><p className={`font-semibold ${service.active ? "" : "text-[var(--ink-muted)] line-through"}`}>{service.name}</p><p className="mt-1 text-[13px] text-[var(--ink-muted)]">{service.durationMinutes} min{service.description ? ` · ${service.description}` : ""}</p></div>
            <span className="tabular font-semibold text-[var(--accent)]">{formatMoney(service.priceInCents, service.currency)}</span>
            <span className={`text-[12px] font-semibold ${service.active ? "text-[var(--success)]" : "text-[var(--ink-muted)]"}`}>{service.active ? "Activo" : "Inactivo"}</span>
            <span className="text-[13px] font-semibold text-[var(--accent)] group-open:hidden">Editar</span>
          </summary>
          <div className="border-t border-[var(--line)] bg-[var(--surface)] px-5 py-5">
            <ActionForm action={updateService.bind(null, service.id)} submitLabel="Guardar cambios"><ServiceFields defaults={{ name: service.name, description: service.description, durationMinutes: service.durationMinutes, price: service.priceInCents / 100 }} /></ActionForm>
            <div className="mt-4 flex flex-wrap gap-5 border-t border-[var(--line)] pt-4">
              <InlineAction action={toggleService.bind(null, service.id)} label={service.active ? "Desactivar (ocultar de reservas)" : "Activar"} className="text-[13px] font-semibold text-[var(--ink-muted)]" />
              <InlineAction action={deleteService.bind(null, service.id)} label={service._count.bookings > 0 ? "Eliminar (se desactivará: tiene citas)" : "Eliminar"} confirm={`¿Eliminar "${service.name}"?`} className="text-[13px] font-semibold text-[var(--danger)]" />
            </div>
          </div>
        </details>)}</div>
      </section>
    </div>
  </main>;
}
