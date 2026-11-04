import { ActionForm, InlineAction } from "../../../../components/action-form";
import { ExpenseFields } from "../../../../components/expense-fields";
import { BusinessTabs, PageHeader, cardClass, fieldClass } from "../../../../components/panel-ui";
import { requireOwnerOrganization } from "../../../../lib/organization";
import { prisma } from "../../../../lib/prisma";
import { addDays, formatDateStr, formatMoney, isValidDate, todayInZone, zonedToUtc } from "../../../../lib/time";
import { createExpense, deleteExpense } from "../../actions";

export const metadata = { title: "Tablero de gastos" };

const MAX_RANGE_DAYS = 366;
// Los gastos se guardan en pesos; formatMoney trabaja en centavos.
const pesos = (value: number) => formatMoney(value * 100);
const ddmmyyyy = (date: string) => `${date.slice(8, 10)}-${date.slice(5, 7)}-${date.slice(0, 4)}`;

function daysBetween(from: string, to: string) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

function groupTotals<T>(items: T[], key: (item: T) => string, value: (item: T) => number) {
  const map = new Map<string, { total: number; count: number }>();
  for (const item of items) {
    const current = map.get(key(item)) ?? { total: 0, count: 0 };
    map.set(key(item), { total: current.total + value(item), count: current.count + 1 });
  }
  return Array.from(map.entries()).map(([label, data]) => ({ label, ...data }));
}

function Bars({ title, eyebrow, rows, empty }: { title: string; eyebrow: string; rows: { label: string; total: number; count: number }[]; empty: string }) {
  const max = Math.max(1, ...rows.map((row) => row.total));
  return <section className={`${cardClass} p-5`}>
    <p className="eyebrow">{eyebrow}</p><h2 className="mt-1 text-[18px] font-semibold">{title}</h2>
    {rows.length === 0 ? <p className="mt-5 text-[13px] text-[var(--ink-muted)]">{empty}</p>
      : <div className="mt-5 space-y-3">{rows.map((row) => <div key={row.label}>
        <div className="flex items-baseline justify-between gap-3 text-sm"><span className="min-w-0 truncate font-semibold">{row.label}</span><span className="tabular shrink-0 text-[12px] text-[var(--ink-muted)]">{pesos(row.total)} · {row.count}</span></div>
        <div className="mt-1.5 h-3 rounded-full bg-[var(--surface)]"><div className="h-3 rounded-full bg-[var(--accent)]" style={{ width: `${(row.total / max) * 100}%` }} /></div>
      </div>)}</div>}
  </section>;
}

export default async function ExpensesPage(props: { searchParams: Promise<{ desde?: string; hasta?: string }> }) {
  const searchParams = await props.searchParams;
  const { organization } = await requireOwnerOrganization();
  const tz = organization.timezone;
  const today = todayInZone(tz);
  const valid = searchParams.desde && searchParams.hasta && isValidDate(searchParams.desde) && isValidDate(searchParams.hasta) && searchParams.desde <= searchParams.hasta && daysBetween(searchParams.desde, searchParams.hasta) <= MAX_RANGE_DAYS;
  const from = valid ? searchParams.desde! : `${today.slice(0, 8)}01`;
  const to = valid ? searchParams.hasta! : today;

  const [expenses, income] = await Promise.all([
    prisma.expense.findMany({ where: { organizationId: organization.id, date: { gte: from, lte: to } }, orderBy: [{ date: "desc" }, { createdAt: "desc" }], take: 2000 }),
    prisma.booking.aggregate({ where: { organizationId: organization.id, status: { in: ["confirmed", "completed"] }, startsAt: { gte: zonedToUtc(from, "00:00", tz), lt: zonedToUtc(addDays(to, 1), "00:00", tz) } }, _sum: { priceInCents: true } })
  ]);

  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.total, 0);
  const totalIncome = Math.round((income._sum.priceInCents ?? 0) / 100);
  const profit = totalIncome - totalExpenses;
  const average = expenses.length ? totalExpenses / expenses.length : 0;
  const byMonth = daysBetween(from, to) > 62;
  const timeline = groupTotals(expenses, (expense) => byMonth ? expense.date.slice(0, 7) : expense.date, (expense) => expense.total)
    .sort((a, b) => a.label.localeCompare(b.label))
    .map((row) => ({ ...row, label: byMonth ? formatDateStr(`${row.label}-01`, { month: "long", year: "numeric" }) : formatDateStr(row.label, { weekday: "short", day: "numeric", month: "short" }) }));
  const bySupplier = groupTotals(expenses, (expense) => expense.supplier, (expense) => expense.total).sort((a, b) => b.total - a.total).slice(0, 8);
  const byResponsible = groupTotals(expenses, (expense) => expense.responsible, (expense) => expense.total).sort((a, b) => b.total - a.total).slice(0, 8);
  const label = `${formatDateStr(from, { day: "numeric", month: "short", year: "numeric" })} – ${formatDateStr(to, { day: "numeric", month: "short", year: "numeric" })}`;

  const kpis = [
    { title: "Total gastos", value: pesos(totalExpenses), note: `${expenses.length} registros` },
    { title: "Gasto promedio", value: pesos(Math.round(average)), note: "por registro" },
    { title: "Ingresos del periodo", value: pesos(totalIncome), note: "citas confirmadas y atendidas" },
    { title: "Utilidad", value: pesos(profit), note: "ingresos − gastos", tone: profit < 0 ? "text-[var(--danger)]" : "text-[var(--success)]" }
  ];

  return <main className="min-h-screen bg-[var(--surface-sunken)]">
    <PageHeader eyebrow="Mi negocio" title="Tablero de gastos" />
    <div className="mx-auto max-w-[1100px] space-y-6 p-6 lg:p-8">
      <BusinessTabs active="gastos" />

      <section className={`${cardClass} p-5`}>
        <h2 className="text-[18px] font-semibold">Registrar gasto</h2>
        <p className="mt-1 text-[13px] text-[var(--ink-muted)]">Solo tú, como administrador, puedes ver y registrar los gastos del negocio.</p>
        <ActionForm action={createExpense} submitLabel="+ Registrar gasto" pendingLabel="Registrando…" resetOnSuccess className="mt-4">
          <ExpenseFields today={today} />
        </ActionForm>
      </section>

      <form className={`${cardClass} grid gap-4 p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end`}>
        <label className="block text-[12px] text-[var(--ink-muted)]">Desde<input type="date" name="desde" defaultValue={from} className={fieldClass} /></label>
        <label className="block text-[12px] text-[var(--ink-muted)]">Hasta<input type="date" name="hasta" defaultValue={to} className={fieldClass} /></label>
        <button type="submit" className="h-10 rounded-[10px] bg-[var(--accent)] px-5 text-sm font-semibold text-[var(--on-accent)]">Filtrar</button>
      </form>

      <p className="text-[13px] text-[var(--ink-muted)]">Periodo: <span className="font-semibold text-[var(--ink)]">{label}</span></p>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => <div key={kpi.title} className={`${cardClass} p-5`}>
          <p className="text-[13px] text-[var(--ink-muted)]">{kpi.title}</p>
          <p className={`tabular mt-3 text-[24px] font-semibold leading-8 ${kpi.tone ?? ""}`}>{kpi.value}</p>
          <p className="mt-2 text-[13px] text-[var(--ink-muted)]">{kpi.note}</p>
        </div>)}
      </section>

      <Bars eyebrow="Evolución" title={byMonth ? "Gastos por mes" : "Gastos por día"} rows={timeline} empty="No hay gastos en este periodo." />
      <div className="grid gap-6 md:grid-cols-2">
        <Bars eyebrow="Proveedores" title="Gastos por proveedor" rows={bySupplier} empty="Sin proveedores en este periodo." />
        <Bars eyebrow="Responsables" title="Gastos por responsable" rows={byResponsible} empty="Sin responsables en este periodo." />
      </div>

      <section className={`${cardClass} overflow-hidden`}>
        <div className="border-b border-[var(--line)] px-5 py-3"><h2 className="font-semibold">Detalle de gastos</h2></div>
        {expenses.length === 0 ? <p className="p-5 text-[13px] text-[var(--ink-muted)]">No hay gastos registrados en este periodo.</p>
          : <div className="overflow-x-auto"><table className="w-full min-w-[860px] text-left text-sm">
            <thead className="text-[12px] uppercase tracking-[.06em] text-[var(--ink-muted)]"><tr className="border-b border-[var(--line)]"><th className="px-4 py-3 font-semibold">Fecha</th><th className="px-4 py-3 font-semibold">Descripción</th><th className="px-4 py-3 text-right font-semibold">Cantidad</th><th className="px-4 py-3 text-right font-semibold">Valor compra</th><th className="px-4 py-3 text-right font-semibold">Total</th><th className="px-4 py-3 font-semibold">Proveedor</th><th className="px-4 py-3 font-semibold">Responsable</th><th className="px-4 py-3" /></tr></thead>
            <tbody className="divide-y divide-[var(--line)]">
              {expenses.map((expense) => <tr key={expense.id}>
                <td className="tabular whitespace-nowrap px-4 py-3">{ddmmyyyy(expense.date)}</td>
                <td className="px-4 py-3 font-semibold">{expense.description}</td>
                <td className="tabular px-4 py-3 text-right">{expense.quantity.toLocaleString("es-CO")}</td>
                <td className="tabular px-4 py-3 text-right">{pesos(expense.unitPrice)}</td>
                <td className="tabular px-4 py-3 text-right font-semibold">{pesos(expense.total)}</td>
                <td className="px-4 py-3">{expense.supplier}</td>
                <td className="px-4 py-3">{expense.responsible}</td>
                <td className="px-4 py-3 text-right"><InlineAction action={deleteExpense.bind(null, expense.id)} label="Eliminar" confirm={`¿Eliminar el gasto "${expense.description}"?`} className="text-[13px] font-semibold text-[var(--danger)]" /></td>
              </tr>)}
              <tr className="font-semibold"><td className="px-4 py-3" colSpan={4}>Total</td><td className="tabular px-4 py-3 text-right text-[var(--accent)]">{pesos(totalExpenses)}</td><td colSpan={3} /></tr>
            </tbody>
          </table></div>}
      </section>
    </div>
  </main>;
}
