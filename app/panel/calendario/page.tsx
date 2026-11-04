import type { Route } from "next";
import Link from "next/link";
import { AutoRefresh } from "../../../components/auto-refresh";
import { PageHeader, StatusBadge, cardClass } from "../../../components/panel-ui";
import { requireOrganization } from "../../../lib/organization";
import { prisma } from "../../../lib/prisma";
import { addDays, dateInZone, formatDateStr, formatTime, isValidDate, todayInZone, weekdayOf, zonedToUtc } from "../../../lib/time";

export const metadata = { title: "Calendario" };

// Colores para distinguir barberos cuando el dueño ve a todos.
const BARBER_COLORS = ["#2563eb", "#db2777", "#16a34a", "#ea580c", "#7c3aed", "#0891b2", "#ca8a04", "#dc2626"];

function mondayOf(date: string) {
  return addDays(date, -((weekdayOf(date) + 6) % 7));
}

export default async function CalendarPage(props: { searchParams: Promise<{ semana?: string; barbero?: string }> }) {
  const searchParams = await props.searchParams;
  const { organization, isOwner, barberId } = await requireOrganization();
  const tz = organization.timezone;
  const today = todayInZone(tz);
  const weekStart = mondayOf(searchParams.semana && isValidDate(searchParams.semana) ? searchParams.semana : today);
  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));

  const barbers = isOwner ? await prisma.barber.findMany({ where: { organizationId: organization.id }, orderBy: [{ active: "desc" }, { createdAt: "asc" }], select: { id: true, name: true, active: true } }) : [];
  // El barbero solo ve su agenda; el dueño puede ver la de todos o la de uno.
  const selected = barberId ?? (barbers.some((barber) => barber.id === searchParams.barbero) ? searchParams.barbero! : "");
  const colorOf = new Map(barbers.map((barber, index) => [barber.id, BARBER_COLORS[index % BARBER_COLORS.length]]));

  const bookings = await prisma.booking.findMany({
    where: { organizationId: organization.id, status: { not: "cancelled" }, ...(selected ? { barberId: selected } : {}), startsAt: { gte: zonedToUtc(weekStart, "00:00", tz), lt: zonedToUtc(addDays(weekStart, 7), "00:00", tz) } },
    include: { service: true, barber: true },
    orderBy: { startsAt: "asc" }
  });
  const byDay = new Map<string, typeof bookings>();
  for (const booking of bookings) {
    const day = dateInZone(booking.startsAt, tz);
    byDay.set(day, [...(byDay.get(day) ?? []), booking]);
  }

  const href = (week: string, barber = selected) => `/panel/calendario?semana=${week}${isOwner && barber ? `&barbero=${barber}` : ""}` as Route;
  const chip = (on: boolean) => `flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] font-semibold ${on ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--on-accent)]" : "border-[var(--line)] bg-[var(--surface-raised)] text-[var(--ink-muted)]"}`;
  const navButton = "flex h-9 items-center rounded-[10px] border border-[var(--line)] bg-[var(--surface-raised)] px-3 text-sm font-semibold hover:border-[var(--accent)]";
  const selectedName = barbers.find((barber) => barber.id === selected)?.name;

  return <main className="min-h-screen bg-[var(--surface-sunken)]">
    <AutoRefresh seconds={30} />
    <PageHeader eyebrow="Agenda" title={isOwner ? (selectedName ? `Calendario de ${selectedName}` : "Calendario del negocio") : "Mi calendario"} actions={isOwner && <Link href="/panel/citas/nueva" className="flex h-10 items-center rounded-[10px] bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--on-accent)]">+ Nueva cita</Link>} />
    <div className="mx-auto max-w-[1440px] space-y-5 p-6 lg:p-8">
      {isOwner && barbers.length > 0 && <nav aria-label="Barberos" className="flex gap-2 overflow-x-auto pb-1">
        <Link href={href(weekStart, "")} className={chip(!selected)}>Todos</Link>
        {barbers.map((barber) => <Link key={barber.id} href={href(weekStart, barber.id)} className={chip(selected === barber.id)}><span className="h-2.5 w-2.5 rounded-full" style={{ background: colorOf.get(barber.id) }} />{barber.name}{barber.active ? "" : " (inactivo)"}</Link>)}
      </nav>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[15px] font-semibold">{formatDateStr(days[0], { day: "numeric", month: "long" })} – {formatDateStr(days[6], { day: "numeric", month: "long", year: "numeric" })}</p>
        <div className="flex gap-2"><Link href={href(addDays(weekStart, -7))} className={navButton} aria-label="Semana anterior">‹</Link><Link href={href(today)} className={navButton}>Hoy</Link><Link href={href(addDays(weekStart, 7))} className={navButton} aria-label="Semana siguiente">›</Link></div>
      </div>

      <div className="grid gap-3 md:grid-cols-7">
        {days.map((day) => {
          const items = byDay.get(day) ?? [];
          const isToday = day === today;
          return <section key={day} className={`${cardClass} min-h-[120px] overflow-hidden ${isToday ? "border-[var(--accent)]" : ""}`}>
            <div className={`border-b border-[var(--line)] px-3 py-2 ${isToday ? "bg-[var(--accent-soft)]" : ""}`}>
              <p className="text-[12px] font-semibold uppercase tracking-[.06em] text-[var(--ink-muted)]">{formatDateStr(day, { weekday: "short" })}</p>
              <p className={`tabular text-[18px] font-semibold ${isToday ? "text-[var(--accent)]" : ""}`}>{formatDateStr(day, { day: "numeric" })} <span className="text-[12px] font-normal text-[var(--ink-muted)]">{items.length ? `${items.length} citas` : ""}</span></p>
            </div>
            <div className="space-y-2 p-2">
              {items.length === 0 && <p className="px-1 py-2 text-[12px] text-[var(--ink-muted)]">Sin citas</p>}
              {items.map((booking) => <div key={booking.id} className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-2 text-[12px]" style={{ borderLeft: `3px solid ${booking.barberId ? colorOf.get(booking.barberId) ?? "var(--accent)" : "var(--accent)"}` }}>
                <p className="tabular font-semibold">{formatTime(booking.startsAt, tz)} – {formatTime(booking.endsAt, tz)}</p>
                <p className="mt-0.5 truncate font-semibold">{booking.customerName}</p>
                <p className="truncate text-[var(--ink-muted)]">{booking.service.name}{isOwner && !selected && booking.barber ? ` · ${booking.barber.name}` : ""}</p>
                {booking.status !== "confirmed" && <div className="mt-1"><StatusBadge status={booking.status} /></div>}
              </div>)}
            </div>
          </section>;
        })}
      </div>
      <p className="text-[12px] text-[var(--ink-muted)]">El calendario se actualiza solo cada 30 segundos. Las citas canceladas no se muestran.{isOwner ? <> Para reprogramar o cancelar, ve a <Link href="/panel/citas" className="font-semibold text-[var(--accent)]">Citas</Link>.</> : " Para cambios en tus citas, habla con el administrador."}</p>
    </div>
  </main>;
}
