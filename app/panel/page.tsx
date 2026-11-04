import Link from "next/link";
import { redirect } from "next/navigation";
import { CopyButton } from "../../components/copy-button";
import { PageHeader, StatusBadge, cardClass } from "../../components/panel-ui";
import { publicBookingUrl, requireOrganization } from "../../lib/organization";
import { prisma } from "../../lib/prisma";
import { addDays, formatLongDate, formatMoney, formatTime, greeting, todayInZone, zonedToUtc } from "../../lib/time";

export default async function PanelPage(props: { searchParams: Promise<{ nuevo?: string }> }) {
  const searchParams = await props.searchParams;
  const { session, organization, isOwner, barberId } = await requireOrganization();
  if (!isOwner) redirect("/panel/calendario");
  const tz = organization.timezone;
  // El barbero ve solo su agenda.
  const mine = barberId ? { barberId } : {};
  const today = todayInZone(tz);
  const dayStart = zonedToUtc(today, "00:00", tz), dayEnd = zonedToUtc(addDays(today, 1), "00:00", tz);
  const monthStart = zonedToUtc(`${today.slice(0, 8)}01`, "00:00", tz);
  const weekEnd = zonedToUtc(addDays(today, 7), "00:00", tz);

  const [todayBookings, monthRevenue, weekCount, serviceCount] = await Promise.all([
    prisma.booking.findMany({ where: { organizationId: organization.id, ...mine, startsAt: { gte: dayStart, lt: dayEnd }, status: { not: "cancelled" } }, include: { service: true, barber: true }, orderBy: { startsAt: "asc" } }),
    prisma.booking.aggregate({ where: { organizationId: organization.id, ...mine, startsAt: { gte: monthStart, lt: dayEnd }, status: { in: ["confirmed", "completed"] } }, _sum: { priceInCents: true } }),
    prisma.booking.count({ where: { organizationId: organization.id, ...mine, startsAt: { gte: new Date(), lt: weekEnd }, status: "confirmed" } }),
    prisma.service.count({ where: { organizationId: organization.id, active: true } })
  ]);
  const publicUrl = publicBookingUrl(organization.slug);
  const firstName = session.user.name.split(" ")[0];
  const monthName = new Intl.DateTimeFormat("es-CO", { timeZone: tz, month: "long" }).format(new Date());

  return <main className="min-h-screen bg-[var(--surface-sunken)]">
    <PageHeader eyebrow={formatLongDate(new Date(), tz)} title={`${greeting(tz)}, ${firstName}.`} actions={<Link href="/panel/citas/nueva" className="flex h-10 items-center rounded-[10px] bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--on-accent)]">+ Nueva cita</Link>} />
    <div className="mx-auto max-w-[1440px] space-y-6 p-6 lg:p-8">
      {searchParams.nuevo && <section className={`${cardClass} border-[var(--accent)] p-5`}><p className="eyebrow">¡Tu negocio está listo!</p><p className="mt-2 text-[15px]">Creamos un horario y 3 servicios de ejemplo. Ajústalos en <Link href="/panel/servicios" className="font-semibold text-[var(--accent)]">Servicios</Link> y <Link href="/panel/disponibilidad" className="font-semibold text-[var(--accent)]">Disponibilidad</Link>, y comparte tu página de reservas con tus clientes.</p></section>}

      <section className="grid gap-4 sm:grid-cols-3">
        <div className={`${cardClass} p-5`}><p className="text-[13px] text-[var(--ink-muted)]">Citas de hoy</p><p className="tabular mt-3 text-[32px] font-semibold leading-9">{todayBookings.length}</p><p className="mt-2 text-[13px] text-[var(--ink-muted)]">{weekCount} por atender en los próximos 7 días</p></div>
        <div className={`${cardClass} p-5`}><p className="text-[13px] text-[var(--ink-muted)]">Ingresos agendados</p><p className="tabular mt-3 text-[32px] font-semibold leading-9">{formatMoney(monthRevenue._sum.priceInCents ?? 0)}</p><p className="mt-2 text-[13px] text-[var(--ink-muted)]">COP · {monthName} hasta hoy</p></div>
        <div className={`${cardClass} p-5`}><p className="text-[13px] text-[var(--ink-muted)]">Servicios activos</p><p className="tabular mt-3 text-[32px] font-semibold leading-9">{serviceCount}</p>{isOwner && <Link href="/panel/servicios" className="mt-2 block text-[13px] font-semibold text-[var(--accent)]">Administrar →</Link>}</div>
      </section>

      <section className={cardClass}>
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--line)] p-5"><div><p className="eyebrow">Agenda de hoy</p><h2 className="mt-1 text-[18px] font-semibold">Citas de hoy</h2></div><Link href="/panel/citas" className="text-sm font-semibold text-[var(--accent)]">Ver todas las citas →</Link></div>
        {todayBookings.length === 0 ? <p className="p-5 text-[13px] text-[var(--ink-muted)]">No tienes citas para hoy. Comparte tu página de reservas para empezar a recibirlas.</p>
          : <div className="divide-y divide-[var(--line)]">{todayBookings.map((booking) => <div className="flex items-center gap-4 px-5 py-4" key={booking.id}><span className="tabular w-12 text-sm font-semibold text-[var(--ink-muted)]">{formatTime(booking.startsAt, tz)}</span><div className={`h-12 w-[3px] rounded-full ${booking.status === "completed" ? "bg-[var(--success)]" : "bg-[var(--accent)]"}`} /><div className="min-w-0 flex-1"><p className="truncate font-semibold">{booking.service.name}</p><p className="truncate text-[13px] text-[var(--ink-muted)]">{booking.customerName} · {booking.service.durationMinutes} min{isOwner && booking.barber ? ` · ${booking.barber.name}` : ""}</p></div><StatusBadge status={booking.status} /></div>)}</div>}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className={`${cardClass} p-5`}><p className="eyebrow">Tu página de reservas</p><h2 className="mt-1 text-[18px] font-semibold">Compártela con tus clientes</h2><p className="mt-3 break-all rounded border border-[var(--line)] bg-[var(--surface)] p-3 text-[13px]">{publicUrl}</p><div className="mt-4 flex flex-wrap gap-3"><CopyButton value={publicUrl} /><a href={publicUrl} target="_blank" rel="noopener noreferrer" className="flex h-10 items-center rounded-[10px] border border-[var(--line)] px-4 text-sm font-semibold">Abrir página</a></div><p className="mt-3 text-[12px] text-[var(--ink-muted)]">Ponla en tu biografía de Instagram, en tu estado de WhatsApp o en Google Maps.</p></div>
        <div className={`${cardClass} p-5`}><p className="eyebrow">Acciones rápidas</p><h2 className="mt-1 text-[18px] font-semibold">Mantén el control</h2><div className="mt-5 grid grid-cols-2 gap-3">{!isOwner && <Link href="/panel/clientes" className="rounded border border-[var(--line)] p-4 text-sm font-semibold hover:border-[var(--accent)]">Clientes<span className="mt-2 block text-[13px] font-normal text-[var(--ink-muted)]">Registrar clientes</span></Link>}{isOwner && <><Link href="/panel/servicios" className="rounded border border-[var(--line)] p-4 text-sm font-semibold hover:border-[var(--accent)]">Servicios<span className="mt-2 block text-[13px] font-normal text-[var(--ink-muted)]">Catálogo y tarifas</span></Link><Link href="/panel/disponibilidad" className="rounded border border-[var(--line)] p-4 text-sm font-semibold hover:border-[var(--accent)]">Bloquear horario<span className="mt-2 block text-[13px] font-normal text-[var(--ink-muted)]">Descansos y cierres</span></Link><Link href="/panel/negocio" className="rounded border border-[var(--line)] p-4 text-sm font-semibold hover:border-[var(--accent)]">WhatsApp<span className="mt-2 block text-[13px] font-normal text-[var(--ink-muted)]">{organization.phone ? "Número configurado" : "Agrega tu número"}</span></Link></>}<Link href="/panel/citas/nueva" className="rounded border border-[var(--line)] p-4 text-sm font-semibold hover:border-[var(--accent)]">Nueva cita<span className="mt-2 block text-[13px] font-normal text-[var(--ink-muted)]">Agenda por teléfono</span></Link></div></div>
      </section>
    </div>
  </main>;
}
