import { ActionForm, InlineAction } from "../../../components/action-form";
import { CustomerSignup } from "../../../components/customer-form";
import { PageHeader, cardClass, fieldClass } from "../../../components/panel-ui";
import { policyUrlFor } from "../../../lib/customers";
import { requireOrganization } from "../../../lib/organization";
import { prisma } from "../../../lib/prisma";
import { formatDateStr } from "../../../lib/time";
import { createCustomer, deleteCustomer, updateCustomer } from "../actions";

export const metadata = { title: "Clientes" };

export default async function CustomersPage() {
  const { organization, isOwner } = await requireOrganization();
  // Los barberos solo registran clientes; la base de datos (ver, modificar, eliminar) es del dueño.
  const customers = isOwner ? await prisma.customer.findMany({ where: { organizationId: organization.id }, orderBy: { createdAt: "desc" }, take: 500 }) : [];
  const short = { day: "numeric", month: "short", year: "numeric" } as const;
  const today = new Date().toISOString().slice(0, 10);

  return <main className="min-h-screen bg-[var(--surface-sunken)]">
    <PageHeader eyebrow="Base de datos" title="Clientes" />
    <div className="mx-auto max-w-[1100px] space-y-6 p-6 lg:p-8">
      <section className={`${cardClass} p-5`}>
        <h2 className="text-[18px] font-semibold">Crear cliente</h2>
        <p className="mt-1 text-[13px] text-[var(--ink-muted)]">Los clientes también pueden registrarse solos desde la página de reservas. El registro es opcional y no es necesario para reservar.{isOwner ? "" : " Los datos registrados solo los ve y modifica el administrador."}</p>
        <div className="mt-4"><CustomerSignup label="+ Crear cliente" action={createCustomer} businessName={organization.name} policyUrl={policyUrlFor(organization)} internal /></div>
      </section>

      {isOwner && <section className={`${cardClass} overflow-hidden`}>
        <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-3"><h2 className="font-semibold">Clientes registrados</h2><span className="text-[13px] text-[var(--ink-muted)]">{customers.length}</span></div>
        {customers.length === 0 ? <p className="p-5 text-[13px] text-[var(--ink-muted)]">Aún no hay clientes registrados.</p>
          : <div className="divide-y divide-[var(--line)]">{customers.map((customer) => <details key={customer.id} className="group">
            <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-1 px-5 py-4">
              <div className="min-w-0 flex-1"><p className="font-semibold">{customer.fullName}</p><p className="mt-1 truncate text-[13px] text-[var(--ink-muted)]">{customer.phone} · {customer.email} · Nació el {formatDateStr(customer.birthDate, short)}</p></div>
              <span className="text-[12px] text-[var(--ink-muted)]">{customer.source === "public" ? "Página de reservas" : "Panel"} · {formatDateStr(customer.createdAt.toISOString().slice(0, 10), short)}</span>
              <span className="text-[13px] font-semibold text-[var(--accent)] group-open:hidden">Gestionar</span>
            </summary>
            <div className="space-y-4 border-t border-[var(--line)] bg-[var(--surface)] px-5 py-5">
              <ActionForm action={updateCustomer.bind(null, customer.id)} submitLabel="Guardar cambios">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-medium sm:col-span-2">Nombre completo<input name="fullName" required minLength={2} maxLength={80} defaultValue={customer.fullName} className={fieldClass} /></label>
                  <label className="block text-sm font-medium">Celular<input name="phone" required type="tel" minLength={7} maxLength={20} defaultValue={customer.phone} className={fieldClass} /></label>
                  <label className="block text-sm font-medium">Correo electrónico<input name="email" required type="email" maxLength={120} defaultValue={customer.email} className={fieldClass} /></label>
                  <label className="block text-sm font-medium">Fecha de nacimiento<input name="birthDate" required type="date" min="1900-01-01" max={today} defaultValue={customer.birthDate} className={fieldClass} /></label>
                </div>
              </ActionForm>
              <InlineAction action={deleteCustomer.bind(null, customer.id)} label="Eliminar cliente" confirm={`¿Eliminar a ${customer.fullName} de tu base de clientes? Sus citas se conservan.`} className="text-[13px] font-semibold text-[var(--danger)]" />
            </div>
          </details>)}</div>}
      </section>}
    </div>
  </main>;
}
