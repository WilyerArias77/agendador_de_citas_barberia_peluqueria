import Link from "next/link";
import { BookingPicker } from "../../../../components/booking-picker";
import { PageHeader, cardClass } from "../../../../components/panel-ui";
import { getPickerData } from "../../../../lib/booking";
import { requireOrganization } from "../../../../lib/organization";
import { createPanelBooking } from "../../actions";

export const metadata = { title: "Nueva cita" };

export default async function NewBookingPage() {
  const { organization } = await requireOrganization();
  const picker = await getPickerData(organization);
  return <main className="min-h-screen bg-[var(--surface-sunken)]">
    <PageHeader eyebrow="Agenda" title="Nueva cita" actions={<Link href="/panel/citas" className="text-sm font-semibold text-[var(--accent)]">← Volver a citas</Link>} />
    <div className="mx-auto max-w-3xl p-6 lg:p-8">
      <section className={`${cardClass} p-5 sm:p-8`}>
        {picker.services.length === 0
          ? <p className="text-[var(--ink-muted)]">Primero agrega al menos un servicio activo en <Link href="/panel/servicios" className="font-semibold text-[var(--accent)]">Servicios</Link>.</p>
          : <BookingPicker slug={organization.slug} services={picker.services} dates={picker.dates} action={createPanelBooking} submitLabel="Crear cita" />}
      </section>
    </div>
  </main>;
}
