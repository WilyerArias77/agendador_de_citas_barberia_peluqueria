import Link from "next/link";
import { InlineAction } from "../../../components/action-form";
import { PageHeader, StatusBadge, cardClass } from "../../../components/panel-ui";
import { requireOrganization } from "../../../lib/organization";
import { prisma } from "../../../lib/prisma";
import { whatsappLink } from "../../../lib/whatsapp";
import { addDays, dateInZone, formatDateStr, formatMoney, formatTime, todayInZone, zonedToUtc } from "../../../lib/time";
import { setBookingStatus } from "../actions";

export const metadata = { title: "Citas" };

export default async function BookingsPage({ searchParams }: { searchParams: { vista?: string; creada?: string; reprogramada?: string } }) {
  const { organization, isOwner, barberId } = await requireOrganization();
  const tz = organization.timezone;
  const past = searchParams.vista === "pasadas";
  const todayStart = zonedToUtc(todayInZone(tz), "00:00", tz);
  const bookings = await prisma.booking.findMany({
    where: { organizationId: organization.id, ...(barberId ? { barberId } : {}), startsAt: past ? { lt: todayStart, gte: zonedToUtc(addDays(todayInZone(tz), -60), "00:00", tz) } : { gte: todayStart } },
    include: { service: true, barber: true },
    orderBy: { startsAt: past ? "desc" : "asc" },
    take: 300
  });
  const groups = new Map<string, typeof bookings>();
  for (const booking of bookings) {
    const day = dateInZone(booking.startsAt, tz);
    groups.set(day, [...(groups.get(day) ?? []), booking]);
  }
  const tab = (active: boolean) => `rounded-full px-4 py-1.5 text-sm font-semibold ${active ? "bg-[var(--accent)] text-[var(--on-accent)]" : "text-[var(--ink-muted)]"}`;

  return <main className="min-h-screen bg-[var(--surface-sunken)]">
    <PageHeader eyebrow="Agenda" title="Citas" actions={<Link href="/panel/citas/nueva" className="flex h-10 items-center rounded-[10px] bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--on-accent)]">+ Nueva cita</Link>} />
    <div className="mx-auto max-w-[1100px] space-y-6 p-6 lg:p-8">
      {searchParams.creada && <p role="status" className="rounded border border-[var(--success)]/40 bg-[var(--success)]/10 p-3 text-sm text-[var(--success)]">Cita creada correctamente.</p>}
      {searchParams.reprogramada && <p role="status" className="rounded border border-[var(--success)]/40 bg-[var(--success)]/10 p-3 text-sm text-[var(--success)]">Cita reprogramada correctamente.</p>}
      <div className="flex w-fit gap-1 rounded-full border border-[var(--line)] bg-[var(--surface-raised)] p-1"><Link href="/panel/citas" className={tab(!past)}>Próximas</Link><Link href="/panel/citas?vista=pasadas" className={tab(past)}>Pasadas</Link></div>

      {groups.size === 0 && <div className={`${cardClass} p-8 text-center`}><p className="font-semibold">{past ? "No hay citas en los últimos 60 días." : "No tienes citas próximas."}</p><p className="mt-2 text-[13px] text-[var(--ink-muted)]">Comparte tu página de reservas o crea una cita manualmente.</p></div>}

      {Array.from(groups.entries()).map(([day, items]) => <section key={day} className={cardClass}>
        <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-3"><h2 className="font-semibold">{formatDateStr(day)}</h2><span className="text-[13px] text-[var(--ink-muted)]">{items.filter((b) => b.status !== "cancelled").length} citas</span></div>
        <div className="divide-y divide-[var(--line)]">{items.map((booking) => {
          const wa = whatsappLink(booking.customerPhone, `Hola ${booking.customerName.split(" ")[0]}, te escribimos de ${organization.name} por tu cita de ${booking.service.name} el ${formatDateStr(day)} a las ${formatTime(booking.startsAt, tz)}.`);
          return <div key={booking.id} className={`flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-4 ${booking.status === "cancelled" ? "opacity-60" : ""}`}>
            <span className="tabular w-12 text-sm font-semibold text-[var(--ink-muted)]">{formatTime(booking.startsAt, tz)}</span>
            <div className="min-w-0 flex-1"><p className="truncate font-semibold">{booking.customerName} <span className="font-normal text-[var(--ink-muted)]">· {booking.service.name}</span></p><p className="truncate text-[13px] text-[var(--ink-muted)]">{isOwner && booking.barber ? `${booking.barber.name} · ` : ""}{booking.customerPhone} · {booking.service.durationMinutes} min · {formatMoney(booking.priceInCents, booking.service.currency)}{booking.notes ? ` · “${booking.notes}”` : ""}</p></div>
            <StatusBadge status={booking.status} />
            <div className="flex w-full flex-wrap items-center gap-4 sm:w-auto">
              {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="text-[13px] font-semibold text-[#25D366]">WhatsApp</a>}
              {booking.status === "confirmed" && <>
                <InlineAction action={setBookingStatus.bind(null, booking.id, "completed")} label="Atendida" />
                {!past && <Link href={`/panel/citas/${booking.id}/reprogramar`} className="text-[13px] font-semibold text-[var(--accent)]">Reprogramar</Link>}
                <InlineAction action={setBookingStatus.bind(null, booking.id, "no_show")} label="No asistió" className="text-[13px] font-semibold text-[var(--ink-muted)]" />
                <InlineAction action={setBookingStatus.bind(null, booking.id, "cancelled")} label="Cancelar" confirm={`¿Cancelar la cita de ${booking.customerName}? El horario quedará libre.`} className="text-[13px] font-semibold text-[var(--danger)]" />
              </>}
              {booking.status !== "confirmed" && !past && <InlineAction action={setBookingStatus.bind(null, booking.id, "confirmed")} label="Restaurar" className="text-[13px] font-semibold text-[var(--ink-muted)]" />}
            </div>
          </div>;
        })}</div>
      </section>)}
    </div>
  </main>;
}
