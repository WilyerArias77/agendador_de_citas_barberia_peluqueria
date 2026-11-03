import Link from "next/link";

export const fieldClass = "mt-2 w-full rounded border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--accent)]";
export const cardClass = "rounded-[10px] border border-[var(--line)] bg-[var(--surface-raised)]";

export function PageHeader({ eyebrow, title, actions }: { eyebrow: string; title: string; actions?: React.ReactNode }) {
  return <header className="border-b border-[var(--line)] bg-[var(--surface-raised)]">
    <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 px-6 py-5 lg:px-8">
      <div><p className="eyebrow">{eyebrow}</p><h1 className="mt-1 text-[24px] font-semibold leading-7">{title}</h1></div>
      {actions}
    </div>
  </header>;
}

// Pestañas de Mi negocio: configuración y tablero contable.
export function BusinessTabs({ active }: { active: "datos" | "tablero" | "gastos" }) {
  const tab = (on: boolean) => `shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold ${on ? "bg-[var(--accent)] text-[var(--on-accent)]" : "text-[var(--ink-muted)]"}`;
  return <nav className="flex max-w-full gap-1 overflow-x-auto rounded-full border border-[var(--line)] bg-[var(--surface-raised)] p-1 sm:w-fit"><Link href="/panel/negocio" className={tab(active === "datos")}>Datos y configuración</Link><Link href="/panel/negocio/tablero" className={tab(active === "tablero")}>Tablero de ingresos</Link><Link href="/panel/negocio/gastos" className={tab(active === "gastos")}>Tablero de gastos</Link></nav>;
}

const STATUS_STYLES: Record<string, [string, string]> = {
  confirmed: ["Confirmada", "bg-[var(--accent-soft)] text-[var(--accent)]"],
  completed: ["Atendida", "bg-[var(--success)]/15 text-[var(--success)]"],
  cancelled: ["Cancelada", "bg-[var(--danger)]/15 text-[var(--danger)]"],
  no_show: ["No asistió", "bg-[var(--surface-sunken)] text-[var(--ink-muted)]"]
};

export function StatusBadge({ status }: { status: string }) {
  const [label, style] = STATUS_STYLES[status] ?? [status, "bg-[var(--surface-sunken)] text-[var(--ink-muted)]"];
  return <span className={`shrink-0 rounded-full px-3 py-1 text-[12px] font-semibold ${style}`}>{label}</span>;
}
