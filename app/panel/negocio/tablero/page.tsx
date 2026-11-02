import { BusinessTabs, PageHeader, cardClass, fieldClass } from "../../../../components/panel-ui";
import { requireOwnerOrganization } from "../../../../lib/organization";
import { prisma } from "../../../../lib/prisma";
import { addDays, formatDateStr, formatMoney, isValidDate, todayInZone, zonedToUtc } from "../../../../lib/time";

export const metadata = { title: "Tablero contable" };

// Servicios prestados = citas confirmadas o atendidas (excluye canceladas y "no asistió"), igual que en Inicio.
const COUNTED = ["confirmed", "completed"];
const MAX_RANGE_DAYS = 366;

type Range = { from: string; to: string };
type ServiceRow = { name: string; count: number; revenue: number };

function daysBetween(from: string, to: string) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

function parseRange(from: string | undefined, to: string | undefined, fallback: Range): Range {
  if (!from || !to || !isValidDate(from) || !isValidDate(to) || from > to || daysBetween(from, to) > MAX_RANGE_DAYS) return fallback;
  return { from, to };
}

async function summarize(organizationId: string, timezone: string, range: Range) {
  const rows = await prisma.booking.groupBy({
    by: ["serviceId"],
    where: { organizationId, status: { in: COUNTED }, startsAt: { gte: zonedToUtc(range.from, "00:00", timezone), lt: zonedToUtc(addDays(range.to, 1), "00:00", timezone) } },
    _count: { _all: true },
    _sum: { priceInCents: true }
  });
  return new Map(rows.map((row) => [row.serviceId, { count: row._count._all, revenue: row._sum.priceInCents ?? 0 }]));
}

function delta(current: number, previous: number) {
  if (previous === 0) return current === 0 ? "Sin cambio" : "Nuevo";
  const change = ((current - previous) / previous) * 100;
  return `${change >= 0 ? "▲" : "▼"} ${Math.abs(change).toFixed(0)}%`;
}

export default async function AccountingPage({ searchParams }: { searchParams: { desde?: string; hasta?: string; compDesde?: string; compHasta?: string } }) {
  const { organization } = await requireOwnerOrganization();
  const tz = organization.timezone;
  const today = todayInZone(tz);
  const current = parseRange(searchParams.desde, searchParams.hasta, { from: `${today.slice(0, 8)}01`, to: today });
  const length = daysBetween(current.from, current.to);
  const compare = parseRange(searchParams.compDesde, searchParams.compHasta, { from: addDays(current.from, -(length + 1)), to: addDays(current.from, -1) });

  const [services, currentData, compareData] = await Promise.all([
    prisma.service.findMany({ where: { organizationId: organization.id }, select: { id: true, name: true } }),
    summarize(organization.id, tz, current),
    summarize(organization.id, tz, compare)
  ]);
  const rows = services
    .map((service) => ({ name: service.name, a: currentData.get(service.id) ?? { count: 0, revenue: 0 }, b: compareData.get(service.id) ?? { count: 0, revenue: 0 } }))
    .filter((row) => row.a.count > 0 || row.b.count > 0)
    .sort((x, y) => y.a.revenue - x.a.revenue);
  const total = (data: Map<string, Omit<ServiceRow, "name">>) => Array.from(data.values()).reduce((sum, row) => ({ count: sum.count + row.count, revenue: sum.revenue + row.revenue }), { count: 0, revenue: 0 });
  const totalA = total(currentData), totalB = total(compareData);
  const ticketA = totalA.count ? totalA.revenue / totalA.count : 0, ticketB = totalB.count ? totalB.revenue / totalB.count : 0;
  const maxRevenue = Math.max(1, ...rows.flatMap((row) => [row.a.revenue, row.b.revenue]));
  const label = (range: Range) => `${formatDateStr(range.from, { day: "numeric", month: "short", year: "numeric" })} – ${formatDateStr(range.to, { day: "numeric", month: "short", year: "numeric" })}`;

  const kpis = [
    { title: "Servicios prestados", a: String(totalA.count), b: String(totalB.count), change: delta(totalA.count, totalB.count) },
    { title: "Ingresos", a: formatMoney(totalA.revenue), b: formatMoney(totalB.revenue), change: delta(totalA.revenue, totalB.revenue) },
    { title: "Ticket promedio", a: formatMoney(ticketA), b: formatMoney(ticketB), change: delta(ticketA, ticketB) }
  ];

  return <main className="min-h-screen bg-[var(--surface-sunken)]">
    <PageHeader eyebrow="Mi negocio" title="Tablero contable" />
    <div className="mx-auto max-w-[1100px] space-y-6 p-6 lg:p-8">
      <BusinessTabs active="tablero" />

      <form className={`${cardClass} grid gap-4 p-5 md:grid-cols-[1fr_1fr_auto] md:items-end`}>
        <fieldset><legend className="text-[13px] font-semibold"><span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-[var(--accent)]" />Periodo a consultar</legend>
          <div className="grid grid-cols-2 gap-3"><label className="block text-[12px] text-[var(--ink-muted)]">Desde<input type="date" name="desde" defaultValue={current.from} className={fieldClass} /></label><label className="block text-[12px] text-[var(--ink-muted)]">Hasta<input type="date" name="hasta" defaultValue={current.to} className={fieldClass} /></label></div>
        </fieldset>
        <fieldset><legend className="text-[13px] font-semibold"><span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-[var(--ink-muted)]" />Comparar con</legend>
          <div className="grid grid-cols-2 gap-3"><label className="block text-[12px] text-[var(--ink-muted)]">Desde<input type="date" name="compDesde" defaultValue={compare.from} className={fieldClass} /></label><label className="block text-[12px] text-[var(--ink-muted)]">Hasta<input type="date" name="compHasta" defaultValue={compare.to} className={fieldClass} /></label></div>
        </fieldset>
        <button type="submit" className="h-10 rounded-[10px] bg-[var(--accent)] px-5 text-sm font-semibold text-[var(--on-accent)]">Consultar</button>
      </form>

      <section className="grid gap-4 sm:grid-cols-3">
        {kpis.map((kpi) => <div key={kpi.title} className={`${cardClass} p-5`}>
          <p className="text-[13px] text-[var(--ink-muted)]">{kpi.title}</p>
          <p className="tabular mt-3 text-[28px] font-semibold leading-8">{kpi.a}</p>
          <p className="mt-2 text-[13px] text-[var(--ink-muted)]"><span className="font-semibold text-[var(--ink)]">{kpi.change}</span> vs. {kpi.b}</p>
        </div>)}
      </section>

      <section className={`${cardClass} p-5`}>
        <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="eyebrow">Comparativo</p><h2 className="mt-1 text-[18px] font-semibold">Ingresos por servicio</h2></div>
          <div className="space-y-1 text-[12px] text-[var(--ink-muted)]"><p><span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-[var(--accent)]" />{label(current)}</p><p><span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-[var(--ink-muted)]" />{label(compare)}</p></div></div>
        {rows.length === 0 ? <p className="mt-5 text-[13px] text-[var(--ink-muted)]">No hay servicios prestados en estos periodos.</p>
          : <div className="mt-5 space-y-5">{rows.map((row) => <div key={row.name}>
            <p className="text-sm font-semibold">{row.name}</p>
            {[{ data: row.a, color: "bg-[var(--accent)]" }, { data: row.b, color: "bg-[var(--ink-muted)]" }].map(({ data, color }, index) => <div key={index} className="mt-1.5 flex items-center gap-3">
              <div className="h-3 flex-1 rounded-full bg-[var(--surface)]"><div className={`h-3 rounded-full ${color}`} style={{ width: `${(data.revenue / maxRevenue) * 100}%` }} /></div>
              <span className="tabular w-40 shrink-0 text-right text-[12px] text-[var(--ink-muted)]">{formatMoney(data.revenue)} · {data.count}</span>
            </div>)}
          </div>)}</div>}
      </section>

      <section className={`${cardClass} overflow-hidden`}>
        <div className="border-b border-[var(--line)] px-5 py-3"><h2 className="font-semibold">Resumen de servicios prestados</h2><p className="text-[12px] text-[var(--ink-muted)]">Incluye citas confirmadas y atendidas; excluye canceladas y “no asistió”.</p></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm">
          <thead className="text-[12px] uppercase tracking-[.06em] text-[var(--ink-muted)]"><tr className="border-b border-[var(--line)]"><th className="px-5 py-3 font-semibold">Servicio</th><th className="px-5 py-3 text-right font-semibold">Cantidad</th><th className="px-5 py-3 text-right font-semibold">Ingresos</th><th className="px-5 py-3 text-right font-semibold">Comparado</th></tr></thead>
          <tbody className="divide-y divide-[var(--line)]">
            {rows.map((row) => <tr key={row.name}><td className="px-5 py-3 font-semibold">{row.name}</td><td className="tabular px-5 py-3 text-right">{row.a.count}</td><td className="tabular px-5 py-3 text-right">{formatMoney(row.a.revenue)}</td><td className="tabular px-5 py-3 text-right text-[var(--ink-muted)]">{row.b.count} · {formatMoney(row.b.revenue)}</td></tr>)}
            <tr className="font-semibold"><td className="px-5 py-3">Total</td><td className="tabular px-5 py-3 text-right">{totalA.count}</td><td className="tabular px-5 py-3 text-right text-[var(--accent)]">{formatMoney(totalA.revenue)}</td><td className="tabular px-5 py-3 text-right text-[var(--ink-muted)]">{totalB.count} · {formatMoney(totalB.revenue)}</td></tr>
          </tbody>
        </table></div>
      </section>
    </div>
  </main>;
}
