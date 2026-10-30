"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

export type PickerService = { id: string; name: string; description: string; duration: string; price: string };
export type PickerDate = { value: string; weekday: string; day: string; month: string; open: boolean };
export type BookingFormState = { error?: string };
type Slot = { time: string; startsAt: string };

type Props = {
  slug: string;
  services: PickerService[];
  dates: PickerDate[];
  action: (state: BookingFormState, formData: FormData) => Promise<BookingFormState>;
  submitLabel: string;
  askEmail?: boolean;
};

const inputClass = "mt-2 w-full rounded border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-[var(--ink)] outline-none transition focus:border-[var(--accent)]";

function SubmitButton({ label, disabled }: { label: string; disabled: boolean }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={disabled || pending} className="h-12 w-full rounded-[10px] bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--on-accent)]">{pending ? "Reservando…" : label}</button>;
}

export function BookingPicker({ slug, services, dates, action, submitLabel, askEmail }: Props) {
  const [state, formAction] = useFormState(action, {});
  const [serviceId, setServiceId] = useState(services.length === 1 ? services[0].id : "");
  const [date, setDate] = useState(dates.find((d) => d.open)?.value ?? "");
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [startsAt, setStartsAt] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    setStartsAt("");
    if (!serviceId || !date) { setSlots(null); return; }
    const controller = new AbortController();
    setSlots(null);
    fetch(`/api/slots?slug=${encodeURIComponent(slug)}&service=${serviceId}&date=${date}`, { signal: controller.signal, cache: "no-store" })
      .then((response) => response.json())
      .then((data: { slots: Slot[] }) => setSlots(data.slots ?? []))
      .catch(() => { if (!controller.signal.aborted) setSlots([]); });
    return () => controller.abort();
  }, [slug, serviceId, date, reload]);

  // Si el horario se ocupó mientras se llenaba el formulario, refresca la lista.
  useEffect(() => { if (state.error) setReload((value) => value + 1); }, [state]);

  const step = "flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[13px] font-bold text-[var(--on-accent)]";

  return <form action={formAction} className="space-y-8">
    <input type="hidden" name="serviceId" value={serviceId} />
    <input type="hidden" name="startsAt" value={startsAt} />

    <section>
      <h2 className="flex items-center gap-3 text-[18px] font-semibold"><span className={step}>1</span>Elige el servicio</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {services.map((service) => <button type="button" key={service.id} onClick={() => setServiceId(service.id)} aria-pressed={serviceId === service.id} className={`rounded-[10px] border p-4 text-left transition ${serviceId === service.id ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--line)] bg-[var(--surface)] hover:border-[var(--accent)]"}`}>
          <span className="flex items-start justify-between gap-3"><span className="font-semibold">{service.name}</span><span className="tabular shrink-0 font-semibold text-[var(--accent)]">{service.price}</span></span>
          {service.description && <span className="mt-1 block text-[13px] text-[var(--ink-muted)]">{service.description}</span>}
          <span className="mt-2 block text-[13px] text-[var(--ink-muted)]">{service.duration}</span>
        </button>)}
      </div>
    </section>

    <section>
      <h2 className="flex items-center gap-3 text-[18px] font-semibold"><span className={step}>2</span>Elige el día</h2>
      <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
        {dates.map((d) => <button type="button" key={d.value} disabled={!d.open} onClick={() => setDate(d.value)} aria-pressed={date === d.value} className={`flex w-[68px] shrink-0 flex-col items-center rounded-[10px] border py-3 transition ${date === d.value ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--on-accent)]" : "border-[var(--line)] bg-[var(--surface)] hover:border-[var(--accent)]"}`}>
          <span className="text-[11px] font-semibold uppercase tracking-[.06em]">{d.weekday}</span>
          <span className="tabular text-[22px] font-semibold leading-7">{d.day}</span>
          <span className="text-[11px]">{d.open ? d.month : "Cerrado"}</span>
        </button>)}
      </div>
    </section>

    <section>
      <h2 className="flex items-center gap-3 text-[18px] font-semibold"><span className={step}>3</span>Elige la hora</h2>
      <div className="mt-4">
        {!serviceId ? <p className="text-[13px] text-[var(--ink-muted)]">Primero elige un servicio.</p>
          : slots === null ? <p className="text-[13px] text-[var(--ink-muted)]">Buscando horarios…</p>
          : slots.length === 0 ? <p className="rounded border border-[var(--line)] bg-[var(--surface)] p-4 text-[13px] text-[var(--ink-muted)]">No quedan horarios disponibles este día. Prueba con otra fecha.</p>
          : <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">{slots.map((slot) => <button type="button" key={slot.startsAt} onClick={() => setStartsAt(slot.startsAt)} aria-pressed={startsAt === slot.startsAt} className={`tabular rounded border py-2.5 text-sm font-semibold transition ${startsAt === slot.startsAt ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--on-accent)]" : "border-[var(--line)] bg-[var(--surface)] hover:border-[var(--accent)]"}`}>{slot.time}</button>)}</div>}
      </div>
    </section>

    <section>
      <h2 className="flex items-center gap-3 text-[18px] font-semibold"><span className={step}>4</span>Datos de contacto</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium">Nombre completo<input name="customerName" required minLength={2} maxLength={80} autoComplete="name" placeholder="Juan Pérez" className={inputClass} /></label>
        <label className="block text-sm font-medium">Celular / WhatsApp<input name="customerPhone" required type="tel" inputMode="tel" minLength={7} maxLength={20} autoComplete="tel" placeholder="300 123 4567" className={inputClass} /></label>
        {askEmail && <label className="block text-sm font-medium sm:col-span-2">Correo (opcional)<input name="customerEmail" type="email" maxLength={120} autoComplete="email" placeholder="tucorreo@ejemplo.com" className={inputClass} /></label>}
        <label className="block text-sm font-medium sm:col-span-2">Nota (opcional)<input name="notes" maxLength={300} placeholder="Algo que debamos saber" className={inputClass} /></label>
      </div>
    </section>

    {state.error && <p role="alert" className="rounded border border-[var(--danger)]/40 bg-[var(--danger)]/10 p-3 text-sm text-[var(--danger)]">{state.error}</p>}
    <SubmitButton label={startsAt ? submitLabel : "Elige un horario para continuar"} disabled={!startsAt} />
  </form>;
}
