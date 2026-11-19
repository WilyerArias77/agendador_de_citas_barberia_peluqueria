import Link from "next/link";
import { setupState } from "../lib/setup-steps";
import { cardClass } from "./panel-ui";

// Guía de configuración del negocio en 8 pasos. Cada paso se marca como cumplido desde su propia página.
export function SetupGuide({ completed }: { completed: readonly string[] }) {
  const { steps, done, next } = setupState(completed);

  return <details id="guia" open={done < steps.length} className={`${cardClass} scroll-mt-6 p-5`}>
    <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3">
      <div><p className="eyebrow">Configura tu negocio paso a paso</p><h2 className="mt-1 text-[18px] font-semibold">{done === steps.length ? "¡Tu negocio está listo!" : `Vas en el paso ${next + 1} de ${steps.length}`}</h2></div>
      <span className="tabular rounded-full border border-[var(--line)] px-3 py-1 text-[13px] text-[var(--ink-muted)]">{done}/{steps.length} completos</span>
    </summary>
    <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[var(--surface)]"><div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${(done / steps.length) * 100}%` }} /></div>
    <ol className="mt-5 grid gap-3">{steps.map((step, index) => <li key={step.title} className={`flex gap-3 rounded-[10px] border p-4 ${index === next ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--line)]"}`}>
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${step.done ? "bg-[var(--success)]/20 text-[var(--success)]" : "bg-[var(--surface)] text-[var(--ink-muted)]"}`}>{step.done ? "✓" : step.number}</span>
      <div className="min-w-0">
        <p className="text-[12px] font-semibold uppercase tracking-[.06em] text-[var(--ink-muted)]">Paso {step.number}</p>
        <p className="font-semibold">{step.title}</p>
        <p className="mt-1 text-[13px] text-[var(--ink-muted)]">{step.text}</p>
        {"href" in step && <Link href={step.href} className="mt-2 inline-block text-[13px] font-semibold text-[var(--accent)]">{step.cta} →</Link>}
      </div>
    </li>)}</ol>
  </details>;
}
