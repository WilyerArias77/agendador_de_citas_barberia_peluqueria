import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookingPicker } from "../../../components/booking-picker";
import { SocialLinks } from "../../../components/social-links";
import { WhatsappButton } from "../../../components/whatsapp-button";
import { getPickerData } from "../../../lib/booking";
import { hasActiveAccess } from "../../../lib/organization";
import { prisma } from "../../../lib/prisma";
import { WEEKDAYS, WEEK_ORDER } from "../../../lib/time";
import { createPublicBooking } from "./actions";

export const dynamic = "force-dynamic";

async function getOrganization(slug: string) {
  return prisma.organization.findUnique({ where: { slug }, include: { availability: true } });
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const organization = await getOrganization(params.slug);
  return { title: organization ? `Reserva en ${organization.name}` : "Negocio no encontrado" };
}

export default async function PublicBookingPage({ params }: { params: { slug: string } }) {
  const organization = await getOrganization(params.slug);
  if (!organization) notFound();
  const active = hasActiveAccess(organization);
  const picker = active ? await getPickerData(organization) : null;
  const schedule = WEEK_ORDER.map((weekday) => ({ weekday, day: organization.availability.find((d) => d.weekday === weekday) }));
  const whatsappMessage = `Hola ${organization.name}, quiero información sobre una cita.`;

  return <main className="min-h-screen bg-[var(--surface-sunken)]">
    <header className="relative overflow-hidden border-b border-[var(--line)] bg-[var(--surface-raised)]">
      <div className="stripe-mark absolute right-0 top-0 h-full w-10 opacity-70 sm:w-16" />
      <div className="relative mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
        <p className="eyebrow">Reserva en línea</p>
        <h1 className="display mt-3 pr-12 text-[40px] leading-[1.05] sm:text-[52px]">{organization.name}</h1>
        {organization.address && <p className="mt-4 text-[var(--ink-muted)]">{organization.address}</p>}
        {organization.phone && <div className="mt-6"><WhatsappButton phone={organization.phone} message={whatsappMessage} variant="inline" /></div>}
      </div>
    </header>

    <div className="mx-auto grid max-w-5xl gap-6 px-5 py-8 sm:px-8 lg:grid-cols-[1fr_280px]">
      <section className="rounded-[10px] border border-[var(--line)] bg-[var(--surface-raised)] p-5 sm:p-8">
        {!active ? <div className="py-10 text-center"><p className="eyebrow">Agenda no disponible</p><h2 className="display mt-3 text-[32px]">Por ahora no recibimos reservas en línea.</h2><p className="mt-3 text-[var(--ink-muted)]">Comunícate directamente con el negocio para agendar tu cita.</p></div>
          : picker!.services.length === 0 ? <div className="py-10 text-center"><h2 className="display text-[32px]">Muy pronto podrás reservar aquí.</h2><p className="mt-3 text-[var(--ink-muted)]">Este negocio todavía está configurando sus servicios.</p></div>
          : <BookingPicker slug={organization.slug} services={picker!.services} dates={picker!.dates} action={createPublicBooking.bind(null, organization.slug)} submitLabel="Confirmar reserva" askEmail />}
      </section>

      <aside className="h-fit rounded-[10px] border border-[var(--line)] bg-[var(--surface-raised)] p-5">
        <p className="eyebrow">Horario</p>
        <ul className="mt-4 space-y-2 text-sm">
          {schedule.map(({ weekday, day }) => <li key={weekday} className="flex justify-between gap-3"><span className="text-[var(--ink-muted)]">{WEEKDAYS[weekday]}</span><span className="tabular">{day ? `${day.startsAt} – ${day.endsAt}` : "Cerrado"}</span></li>)}
        </ul>
      </aside>
    </div>

    <footer className="pb-28 pt-4 text-center text-[12px] text-[var(--ink-muted)]"><p>Reservas con <Link href="/" className="font-semibold text-[var(--accent)]">Growing Solutions</Link></p><SocialLinks className="mt-3" /></footer>
    {organization.phone && <WhatsappButton phone={organization.phone} message={whatsappMessage} />}
  </main>;
}
