import { CustomerForm } from "../../../components/customer-form";
import { PageHeader, cardClass } from "../../../components/panel-ui";
import { requireOrganization } from "../../../lib/organization";
import { prisma } from "../../../lib/prisma";
import { formatDateStr } from "../../../lib/time";
import { createCustomer } from "../actions";

export const metadata = { title: "Clientes" };

export default async function CustomersPage() {
  const { organization } = await requireOrganization();
  const customers = await prisma.customer.findMany({ where: { organizationId: organization.id }, orderBy: { createdAt: "desc" }, take: 500 });
  const short = { day: "numeric", month: "short", year: "numeric" } as const;

  return <main className="min-h-screen bg-[var(--surface-sunken)]">
    <PageHeader eyebrow="Base de datos" title="Clientes" />
    <div className="mx-auto max-w-[1100px] space-y-6 p-6 lg:p-8">
      <section className={`${cardClass} p-5`}>
        <h2 className="text-[18px] font-semibold">Crear cliente</h2>
        <p className="mt-1 text-[13px] text-[var(--ink-muted)]">Los clientes también pueden registrarse solos desde tu página de reservas. El registro es opcional y no es necesario para reservar.</p>
        <div className="mt-4"><CustomerForm action={createCustomer} businessName={organization.name} policyUrl={organization.privacyPolicyUrl} internal /></div>
      </section>

      <section className={`${cardClass} overflow-hidden`}>
        <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-3"><h2 className="font-semibold">Clientes registrados</h2><span className="text-[13px] text-[var(--ink-muted)]">{customers.length}</span></div>
        {customers.length === 0 ? <p className="p-5 text-[13px] text-[var(--ink-muted)]">Aún no hay clientes registrados.</p>
          : <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-[12px] uppercase tracking-[.06em] text-[var(--ink-muted)]"><tr className="border-b border-[var(--line)]"><th className="px-5 py-3 font-semibold">Nombre</th><th className="px-5 py-3 font-semibold">Celular</th><th className="px-5 py-3 font-semibold">Correo</th><th className="px-5 py-3 font-semibold">Nacimiento</th><th className="px-5 py-3 font-semibold">Origen</th><th className="px-5 py-3 font-semibold">Registro</th></tr></thead>
            <tbody className="divide-y divide-[var(--line)]">{customers.map((customer) => <tr key={customer.id}>
              <td className="px-5 py-3 font-semibold">{customer.fullName}</td>
              <td className="tabular px-5 py-3">{customer.phone}</td>
              <td className="px-5 py-3">{customer.email}</td>
              <td className="tabular px-5 py-3">{formatDateStr(customer.birthDate, short)}</td>
              <td className="px-5 py-3 text-[var(--ink-muted)]">{customer.source === "public" ? "Página de reservas" : "Panel"}</td>
              <td className="tabular px-5 py-3 text-[var(--ink-muted)]">{formatDateStr(customer.createdAt.toISOString().slice(0, 10), short)}</td>
            </tr>)}</tbody>
          </table></div>}
      </section>
    </div>
  </main>;
}
