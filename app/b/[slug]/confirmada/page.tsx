import Link from "next/link";
import { notFound } from "next/navigation";
import { FinishButton } from "../../../../components/finish-button";
import { WhatsappButton } from "../../../../components/whatsapp-button";
import { prisma } from "../../../../lib/prisma";
import { formatLongDate, formatMoney, formatTime } from "../../../../lib/time";

export const dynamic = "force-dynamic";

export default async function BookingConfirmedPage({ params, searchParams }: { params: { slug: string }; searchParams: { cita?: string } }) {
  const booking = searchParams.cita ? await prisma.booking.findFirst({ where: { id: searchParams.cita, organization: { slug: params.slug }, createdAt: { gte: new Date(Date.now() - 86_400_000) } }, include: { service: true, organization: true, barber: true } }) : null;
  if (!booking) notFound();
  const { organization } = booking;
  const when = `${formatLongDate(booking.startsAt, organization.timezone)} a las ${formatTime(booking.startsAt, organization.timezone)}`;

  return <main className="flex min-h-screen items-center justify-center bg-[var(--surface-sunken)] px-5 py-12">
    <div className="w-full max-w-md rounded-[10px] border border-[var(--line)] bg-[var(--surface-raised)] p-8 text-center sm:p-10">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--success)]/15 text-2xl text-[var(--success)]">✓</div>
      <p className="eyebrow mt-6">Reserva confirmada</p>
      <h1 className="display mt-3 text-[34px] leading-[1.1]">¡Te esperamos, {booking.customerName.split(" ")[0]}!</h1>
      <dl className="mt-8 space-y-3 rounded-[10px] border border-[var(--line)] bg-[var(--surface)] p-5 text-left text-sm">
        <div className="flex justify-between gap-4"><dt className="text-[var(--ink-muted)]">Negocio</dt><dd className="text-right font-semibold">{organization.name}</dd></div>
        <div className="flex justify-between gap-4"><dt className="text-[var(--ink-muted)]">Servicio</dt><dd className="text-right font-semibold">{booking.service.name}</dd></div>
        {booking.barber && <div className="flex justify-between gap-4"><dt className="text-[var(--ink-muted)]">Barbero</dt><dd className="text-right font-semibold">{booking.barber.name}</dd></div>}
        <div className="flex justify-between gap-4"><dt className="text-[var(--ink-muted)]">Cuándo</dt><dd className="text-right font-semibold">{when}</dd></div>
        <div className="flex justify-between gap-4"><dt className="text-[var(--ink-muted)]">Valor</dt><dd className="tabular text-right font-semibold text-[var(--accent)]">{formatMoney(booking.priceInCents, booking.service.currency)}</dd></div>
        {organization.address && <div className="flex justify-between gap-4"><dt className="text-[var(--ink-muted)]">Dirección</dt><dd className="text-right">{organization.address}</dd></div>}
      </dl>
      <p className="mt-6 text-[13px] text-[var(--ink-muted)]">Guarda esta información. Si necesitas cambiar o cancelar tu cita, escríbele al negocio.</p>
      <div className="mt-6 flex flex-col gap-3">
        {organization.phone && <WhatsappButton phone={organization.phone} variant="inline" label="Escribir al negocio" message={`Hola ${organization.name}, tengo una reserva de ${booking.service.name} el ${when} a nombre de ${booking.customerName}.`} />}
        <div className="flex gap-3">
          <Link href={`/b/${organization.slug}`} className="flex h-11 flex-1 items-center justify-center rounded-[10px] border border-[var(--accent)] px-4 text-sm font-semibold text-[var(--accent)]">Hacer otra reserva</Link>
          <FinishButton businessName={organization.name} />
        </div>
      </div>
    </div>
  </main>;
}
