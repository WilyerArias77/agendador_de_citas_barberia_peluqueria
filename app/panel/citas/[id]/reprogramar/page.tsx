import Link from "next/link";
import { notFound } from "next/navigation";
import { BookingPicker } from "../../../../../components/booking-picker";
import { PageHeader, cardClass } from "../../../../../components/panel-ui";
import { getPickerData } from "../../../../../lib/booking";
import { requireOwnerOrganization } from "../../../../../lib/organization";
import { prisma } from "../../../../../lib/prisma";
import { formatLongDate, formatTime } from "../../../../../lib/time";
import { reschedulePanelBooking } from "../../../actions";

export const metadata = { title: "Reprogramar cita" };

export default async function RescheduleBookingPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { organization, barberId } = await requireOwnerOrganization();
  const booking = await prisma.booking.findFirst({ where: { id: params.id, organizationId: organization.id, status: "confirmed", ...(barberId ? { barberId } : {}) }, include: { service: true, barber: true } });
  if (!booking) notFound();
  const picker = await getPickerData(organization);
  const tz = organization.timezone;

  return <main className="min-h-screen bg-[var(--surface-sunken)]">
    <PageHeader eyebrow="Agenda" title="Reprogramar cita" actions={<Link href="/panel/citas" className="text-sm font-semibold text-[var(--accent)]">← Volver a citas</Link>} />
    <div className="mx-auto max-w-3xl space-y-6 p-6 lg:p-8">
      <section className={`${cardClass} p-5`}>
        <p className="eyebrow">Cita actual</p>
        <p className="mt-2 font-semibold">{booking.customerName} · {booking.service.name}</p>
        <p className="mt-1 text-[13px] text-[var(--ink-muted)]">{formatLongDate(booking.startsAt, tz)} a las {formatTime(booking.startsAt, tz)}{booking.barber ? ` · ${booking.barber.name}` : ""}</p>
      </section>
      <section className={`${cardClass} p-5 sm:p-8`}>
        <BookingPicker slug={organization.slug} barbers={barberId ? [] : picker.barbers} initialBarberId={barberId ?? booking.barberId ?? undefined} services={picker.services} initialServiceId={booking.serviceId} dates={picker.dates} action={reschedulePanelBooking.bind(null, booking.id)} submitLabel="Guardar nuevo horario" hideContact />
      </section>
    </div>
  </main>;
}
