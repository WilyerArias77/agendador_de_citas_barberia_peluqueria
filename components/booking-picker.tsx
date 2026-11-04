"use client";

import { useEffect, useMemo, useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

export type PickerService = { id: string; name: string; description: string; duration: string; price: string };
export type PickerDate = { value: string; open: boolean };
export type PickerBarber = { id: string; name: string };
export type BookingFormState = { error?: string };
type Slot = { time: string; startsAt: string };

type Props = {
  slug: string;
  services: PickerService[];
  dates: PickerDate[];
  barbers?: PickerBarber[];
  action: (state: BookingFormState, formData: FormData) => Promise<BookingFormState>;
  submitLabel: string;
  askEmail?: boolean;
  emailHint?: string;
  // Reprogramar: sin datos de contacto y con la cita actual preseleccionada.
  hideContact?: boolean;
  initialServiceId?: string;
  initialBarberId?: string;
};

const inputClass = "mt-2 w-full rounded border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-[var(--ink)] outline-none transition focus:border-[var(--accent)]";
const WEEK_HEADER = ["L", "M", "X", "J", "V", "S", "D"];

function SubmitButton({ label, disabled }: { label: string; disabled: boolean }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={disabled || pending} className="h-12 w-full rounded-[10px] bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--on-accent)]">{pending ? "Guardando…" : label}</button>;
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]?.toUpperCase()).join("");
}

function monthLabel(month: string) {
  const text = new Intl.DateTimeFormat("es-CO", { timeZone: "UTC", month: "long", year: "numeric" }).format(new Date(`${month}-01T12:00:00Z`));
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// Mes completo, lunes primero. Solo se pueden elegir los días abiertos dentro de la ventana de reserva.
function MonthCalendar({ dates, value, onChange }: { dates: PickerDate[]; value: string; onChange: (value: string) => void }) {
  const months = useMemo(() => Array.from(new Set(dates.map((d) => d.value.slice(0, 7)))), [dates]);
  const [monthIndex, setMonthIndex] = useState(Math.max(0, months.indexOf(value.slice(0, 7))));
  const month = months[monthIndex] ?? months[0];
  const byValue = useMemo(() => new Map(dates.map((d) => [d.value, d])), [dates]);
  if (!month) return null;
  const [year, monthNumber] = month.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const offset = (new Date(Date.UTC(year, monthNumber - 1, 1)).getUTCDay() + 6) % 7;
  const navButton = "flex h-8 w-8 items-center justify-center rounded-full border border-[var(--line)] text-sm hover:border-[var(--accent)]";

  return <div className="rounded-[10px] border border-[var(--line)] bg-[var(--surface)] p-3 sm:p-4">
    <div className="flex items-center justify-between">
      <button type="button" aria-label="Mes anterior" disabled={monthIndex === 0} onClick={() => setMonthIndex(monthIndex - 1)} className={navButton}>‹</button>
      <p className="text-sm font-semibold">{monthLabel(month)}</p>
      <button type="button" aria-label="Mes siguiente" disabled={monthIndex >= months.length - 1} onClick={() => setMonthIndex(monthIndex + 1)} className={navButton}>›</button>
    </div>
    <div className="mt-3 grid grid-cols-7 gap-1 text-center">
      {WEEK_HEADER.map((day) => <span key={day} className="pb-1 text-[11px] font-semibold text-[var(--ink-muted)]">{day}</span>)}
      {Array.from({ length: offset }, (_, index) => <span key={`empty-${index}`} />)}
      {Array.from({ length: daysInMonth }, (_, index) => {
        const dayValue = `${month}-${String(index + 1).padStart(2, "0")}`;
        const info = byValue.get(dayValue);
        const selectable = !!info?.open;
        const selected = value === dayValue;
        return <button type="button" key={dayValue} disabled={!selectable} onClick={() => onChange(dayValue)} aria-pressed={selected} aria-label={dayValue}
          className={`tabular mx-auto flex h-9 w-9 items-center justify-center rounded-full text-[13px] font-semibold transition ${selected ? "bg-[var(--accent)] text-[var(--on-accent)]" : selectable ? "hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]" : "text-[var(--ink-muted)] opacity-40"} ${info && !info.open ? "line-through" : ""}`}>{index + 1}</button>;
      })}
    </div>
    <p className="mt-2 text-[11px] text-[var(--ink-muted)]">Los días tachados el negocio está cerrado.</p>
  </div>;
}

function to12h(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")}`;
}

// Dos columnas: mañana (hasta las 12:59) y tarde/noche; cada fila es una hora con sus medias horas.
function HourColumns({ slots, value, onChange }: { slots: Slot[]; value: string; onChange: (value: string) => void }) {
  const groups = [
    { title: "Día · AM", icon: "☀", slots: slots.filter((slot) => Number(slot.time.slice(0, 2)) <= 12) },
    { title: "Tarde · Noche · PM", icon: "☾", slots: slots.filter((slot) => Number(slot.time.slice(0, 2)) > 12) }
  ];
  return <div className="grid gap-3 sm:grid-cols-2">
    {groups.map((group) => {
      const hours = Array.from(new Set(group.slots.map((slot) => slot.time.slice(0, 2))));
      return <div key={group.title} className="rounded-[10px] border border-[var(--line)] bg-[var(--surface)] p-3">
        <p className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[.08em] text-[var(--accent)]"><span aria-hidden="true" className="text-[14px]">{group.icon}</span>{group.title}</p>
        {hours.length === 0 ? <p className="mt-3 text-[12px] text-[var(--ink-muted)]">Sin horarios disponibles.</p>
          : <div className="mt-3 space-y-2">{hours.map((hour) => <div key={hour} className="grid grid-cols-2 gap-2">
            {["00", "30"].map((minute) => {
              const slot = group.slots.find((item) => item.time === `${hour}:${minute}`);
              return slot ? <button type="button" key={minute} onClick={() => onChange(slot.startsAt)} aria-pressed={value === slot.startsAt} className={`tabular rounded-full border py-2 text-[13px] font-semibold transition ${value === slot.startsAt ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--on-accent)]" : "border-[var(--line)] hover:border-[var(--accent)]"}`}>{to12h(slot.time)}</button>
                : <span key={minute} className="tabular rounded-full border border-dashed border-[var(--line)] py-2 text-center text-[13px] text-[var(--ink-muted)] opacity-40">{to12h(`${hour}:${minute}`)}</span>;
            })}
          </div>)}</div>}
      </div>;
    })}
  </div>;
}

export function BookingPicker({ slug, services, dates, barbers = [], action, submitLabel, askEmail, emailHint, hideContact, initialServiceId, initialBarberId }: Props) {
  const [state, formAction] = useActionState(action, {});
  const [barberId, setBarberId] = useState(initialBarberId ?? (barbers.length === 1 ? barbers[0].id : ""));
  const [serviceId, setServiceId] = useState(initialServiceId ?? (services.length === 1 ? services[0].id : ""));
  const [date, setDate] = useState(dates.find((d) => d.open)?.value ?? "");
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [startsAt, setStartsAt] = useState("");
  const [reload, setReload] = useState(0);
  const needsBarber = barbers.length > 0;
  const barberReady = !needsBarber || !!barberId;

  useEffect(() => {
    setStartsAt("");
    if (!serviceId || !date || !barberReady) { setSlots(null); return; }
    const controller = new AbortController();
    setSlots(null);
    fetch(`/api/slots?slug=${encodeURIComponent(slug)}&service=${serviceId}&date=${date}${barberId ? `&barber=${barberId}` : ""}`, { signal: controller.signal, cache: "no-store" })
      .then((response) => response.json())
      .then((data: { slots: Slot[] }) => setSlots(data.slots ?? []))
      .catch(() => { if (!controller.signal.aborted) setSlots([]); });
    return () => controller.abort();
  }, [slug, serviceId, date, barberId, barberReady, reload]);

  // Si el horario se ocupó mientras se llenaba el formulario, refresca la lista.
  useEffect(() => { if (state.error) setReload((value) => value + 1); }, [state]);

  const step = "flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[12px] font-bold text-[var(--on-accent)]";
  const heading = "flex items-center gap-3 text-[16px] font-semibold";
  const locked = "pointer-events-none opacity-40";
  let number = 0;

  return <form action={formAction} className="space-y-7">
    <input type="hidden" name="serviceId" value={serviceId} />
    <input type="hidden" name="barberId" value={barberId} />
    <input type="hidden" name="startsAt" value={startsAt} />

    {needsBarber && <section>
      <h2 className={heading}><span className={step}>{++number}</span>Elige tu barbero</h2>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {barbers.map((barber) => <button type="button" key={barber.id} onClick={() => setBarberId(barber.id)} aria-pressed={barberId === barber.id} className={`flex items-center gap-2 rounded-[10px] border p-2.5 text-left text-sm font-semibold transition ${barberId === barber.id ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--line)] bg-[var(--surface)] hover:border-[var(--accent)]"}`}>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[12px] font-bold text-[var(--on-accent)]">{initials(barber.name)}</span>
          <span className="min-w-0 truncate">{barber.name}</span>
        </button>)}
      </div>
    </section>}

    <section className={barberReady ? "" : locked}>
      <h2 className={heading}><span className={step}>{++number}</span>Elige el servicio</h2>
      <div className="mt-3 grid gap-2">
        {services.map((service) => <button type="button" key={service.id} onClick={() => setServiceId(service.id)} aria-pressed={serviceId === service.id} className={`rounded-[10px] border px-4 py-3 text-left transition ${serviceId === service.id ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--line)] bg-[var(--surface)] hover:border-[var(--accent)]"}`}>
          <span className="flex items-start justify-between gap-3"><span className="text-sm font-semibold">{service.name}</span><span className="tabular shrink-0 text-sm font-semibold text-[var(--accent)]">{service.price}</span></span>
          <span className="mt-1 block text-[12px] text-[var(--ink-muted)]">{service.description ? `${service.description} · ` : ""}{service.duration}</span>
        </button>)}
      </div>
    </section>

    <section className={barberReady && serviceId ? "" : locked}>
      <h2 className={heading}><span className={step}>{++number}</span>Elige el día</h2>
      <div className="mt-3"><MonthCalendar dates={dates} value={date} onChange={setDate} /></div>
    </section>

    <section>
      <h2 className={heading}><span className={step}>{++number}</span>Elige la hora</h2>
      <div className="mt-3">
        {!barberReady ? <p className="text-[13px] text-[var(--ink-muted)]">Primero elige un barbero.</p>
          : !serviceId ? <p className="text-[13px] text-[var(--ink-muted)]">Primero elige un servicio.</p>
          : slots === null ? <p className="text-[13px] text-[var(--ink-muted)]">Buscando horarios…</p>
          : slots.length === 0 ? <p className="rounded border border-[var(--line)] bg-[var(--surface)] p-4 text-[13px] text-[var(--ink-muted)]">No quedan horarios disponibles este día. Prueba con otra fecha.</p>
          : <HourColumns slots={slots} value={startsAt} onChange={setStartsAt} />}
      </div>
    </section>

    {!hideContact && <section>
      <h2 className={heading}><span className={step}>{++number}</span>Datos de contacto</h2>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium">Nombre completo<input name="customerName" required minLength={2} maxLength={80} autoComplete="name" placeholder="Juan Pérez" className={inputClass} /></label>
        <label className="block text-sm font-medium">Celular / WhatsApp<input name="customerPhone" required type="tel" inputMode="tel" minLength={7} maxLength={20} autoComplete="tel" placeholder="300 123 4567" className={inputClass} /></label>
        {askEmail && <label className="block text-sm font-medium sm:col-span-2">Correo (opcional)<input name="customerEmail" type="email" maxLength={120} autoComplete="email" placeholder="tucorreo@ejemplo.com" className={inputClass} />{emailHint && <span className="mt-1 block text-[12px] font-normal text-[var(--ink-muted)]">{emailHint}</span>}</label>}
        <label className="block text-sm font-medium sm:col-span-2">Nota (opcional)<input name="notes" maxLength={300} placeholder="Algo que debamos saber" className={inputClass} /></label>
      </div>
    </section>}

    {state.error && <p role="alert" className="rounded border border-[var(--danger)]/40 bg-[var(--danger)]/10 p-3 text-sm text-[var(--danger)]">{state.error}</p>}
    <SubmitButton label={startsAt ? submitLabel : "Elige un horario para continuar"} disabled={!startsAt} />
  </form>;
}
