import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookingPicker } from "../../../components/booking-picker";
import { CustomerSignup } from "../../../components/customer-form";
import { SocialLinks } from "../../../components/social-links";
import { WhatsappButton } from "../../../components/whatsapp-button";
import { getPickerData } from "../../../lib/booking";
import { hasActiveAccess } from "../../../lib/organization";
import { prisma } from "../../../lib/prisma";
import { WEEKDAYS, WEEK_ORDER } from "../../../lib/time";
import { createPublicBooking, registerPublicCustomer } from "./actions";

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
      <div className="relative mx-auto max-w-xl px-5 py-8 text-center sm:py-10">
        <p className="eyebrow">Reserva en línea</p>
        <h1 className="display mt-3 px-8 text-[34px] leading-[1.05] sm:text-[44px]">{organization.name}</h1>
        {organization.address && <p className="mt-3 text-[var(--ink-muted)]">{organization.address}</p>}
        {organization.phone && <div className="mt-5"><WhatsappButton phone={organization.phone} message={whatsappMessage} variant="inline" /></div>}
      </div>
    </header>

    <div className="mx-auto max-w-xl space-y-5 px-4 py-6 sm:py-8">
      <section className="rounded-[10px] border border-[var(--line)] bg-[var(--surface-raised)] p-5 sm:p-7">
        {!active ? <div className="py-10 text-center"><p className="eyebrow">Agenda no disponible</p><h2 className="display mt-3 text-[32px]">Por ahora no recibimos reservas en línea.</h2><p className="mt-3 text-[var(--ink-muted)]">Comunícate directamente con el negocio para agendar tu cita.</p></div>
          : picker!.services.length === 0 ? <div className="py-10 text-center"><h2 className="display text-[32px]">Muy pronto podrás reservar aquí.</h2><p className="mt-3 text-[var(--ink-muted)]">Este negocio todavía está configurando sus servicios.</p></div>
          : <BookingPicker slug={organization.slug} barbers={picker!.barbers} services={picker!.services} dates={picker!.dates} action={createPublicBooking.bind(null, organization.slug)} submitLabel="Confirmar reserva" askEmail />}
      </section>

      {active && <section className="rounded-[10px] border border-[var(--line)] bg-[var(--surface-raised)] p-5"><CustomerSignup action={registerPublicCustomer.bind(null, organization.slug)} businessName={organization.name} policyUrl={organization.privacyPolicyUrl} /></section>}

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
