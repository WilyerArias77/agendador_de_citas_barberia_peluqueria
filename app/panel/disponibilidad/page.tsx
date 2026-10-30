import { ActionForm, InlineAction } from "../../../components/action-form";
import { PageHeader, cardClass, fieldClass } from "../../../components/panel-ui";
import { requireOrganization } from "../../../lib/organization";
import { prisma } from "../../../lib/prisma";
import { WEEKDAYS, WEEK_ORDER, formatLongDate, formatTime, todayInZone } from "../../../lib/time";
import { addException, deleteException, saveAvailability } from "../actions";

export const metadata = { title: "Disponibilidad" };

const timeField = "w-[104px] rounded border border-[var(--line)] bg-[var(--surface)] px-2 py-2 text-[13px] tabular text-[var(--ink)] outline-none focus:border-[var(--accent)]";

export default async function AvailabilityPage() {
  const { organization } = await requireOrganization();
  const tz = organization.timezone;
  const [availability, exceptions] = await Promise.all([
    prisma.weeklyAvailability.findMany({ where: { organizationId: organization.id } }),
    prisma.availabilityException.findMany({ where: { organizationId: organization.id, endsAt: { gte: new Date() } }, orderBy: { startsAt: "asc" } })
  ]);

  return <main className="min-h-screen bg-[var(--surface-sunken)]">
    <PageHeader eyebrow="Horarios del negocio" title="Disponibilidad" />
    <div className="mx-auto max-w-3xl space-y-6 p-6 lg:p-8">
      <section className={cardClass}>
        <div className="border-b border-[var(--line)] p-5"><p className="text-[18px] font-semibold">Horario semanal</p><p className="mt-1 text-[13px] text-[var(--ink-muted)]">Tus clientes solo podrán reservar dentro de este horario. Zona horaria: {tz}.</p></div>
        <ActionForm action={saveAvailability} submitLabel="Guardar horario" className="p-5">
          <div className="divide-y divide-[var(--line)]">{WEEK_ORDER.map((weekday) => {
            const day = availability.find((d) => d.weekday === weekday);
            return <div key={weekday} className="flex flex-wrap items-center gap-3 py-4 first:pt-0">
              <label className="flex w-32 items-center gap-2 font-medium"><input type="checkbox" name={`open-${weekday}`} defaultChecked={!!day} className="h-4 w-4 accent-[var(--accent)]" />{WEEKDAYS[weekday]}</label>
              <div className="flex items-center gap-2"><input type="time" name={`start-${weekday}`} defaultValue={day?.startsAt ?? "09:00"} aria-label={`Apertura ${WEEKDAYS[weekday]}`} className={timeField} /><span className="text-[var(--ink-muted)]">a</span><input type="time" name={`end-${weekday}`} defaultValue={day?.endsAt ?? "18:00"} aria-label={`Cierre ${WEEKDAYS[weekday]}`} className={timeField} /></div>
              <div className="flex items-center gap-2 text-[13px] text-[var(--ink-muted)]"><span>Descanso</span><input type="time" name={`breakStart-${weekday}`} defaultValue={day?.breakStartsAt ?? ""} aria-label={`Inicio descanso ${WEEKDAYS[weekday]}`} className={timeField} /><span>a</span><input type="time" name={`breakEnd-${weekday}`} defaultValue={day?.breakEndsAt ?? ""} aria-label={`Fin descanso ${WEEKDAYS[weekday]}`} className={timeField} /></div>
            </div>;
          })}</div>
          <p className="mt-2 text-[12px] text-[var(--ink-muted)]">Desmarca un día para cerrarlo. El descanso es opcional (por ejemplo, almuerzo).</p>
        </ActionForm>
      </section>

      <section className={cardClass}>
        <div className="border-b border-[var(--line)] p-5"><p className="text-[18px] font-semibold">Bloqueos y cierres</p><p className="mt-1 text-[13px] text-[var(--ink-muted)]">Vacaciones, festivos o una diligencia: bloquea horas sin cambiar tu horario habitual.</p></div>
        <ActionForm action={addException} submitLabel="Bloquear" resetOnSuccess className="p-5">
          <div className="grid gap-4 sm:grid-cols-[150px_1fr]">
            <label className="block text-sm font-medium">Fecha<input type="date" name="date" required min={todayInZone(tz)} className={fieldClass} /></label>
            <label className="block text-sm font-medium">Motivo (opcional)<input name="reason" maxLength={120} placeholder="Festivo, vacaciones…" className={fieldClass} /></label>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" name="allDay" className="h-4 w-4 accent-[var(--accent)]" />Todo el día</label>
            <span className="text-[var(--ink-muted)]">o de</span><input type="time" name="start" aria-label="Desde" className={timeField} /><span className="text-[var(--ink-muted)]">a</span><input type="time" name="end" aria-label="Hasta" className={timeField} />
          </div>
        </ActionForm>
        {exceptions.length > 0 && <div className="divide-y divide-[var(--line)] border-t border-[var(--line)]">{exceptions.map((exception) => {
          const allDay = exception.endsAt.getTime() - exception.startsAt.getTime() >= 86_400_000 - 60_000;
          return <div key={exception.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
            <span className="font-medium">{formatLongDate(exception.startsAt, tz)}</span>
            <span className="text-[var(--ink-muted)]">{allDay ? "Todo el día" : `${formatTime(exception.startsAt, tz)} – ${formatTime(exception.endsAt, tz)}`}{exception.reason ? ` · ${exception.reason}` : ""}</span>
            <span className="ml-auto"><InlineAction action={deleteException.bind(null, exception.id)} label="Quitar" className="text-[13px] font-semibold text-[var(--danger)]" /></span>
          </div>;
        })}</div>}
      </section>
    </div>
  </main>;
}
