"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  { href: "/panel", label: "Dashboard", icon: "grid" },
  { href: "/panel/servicios", label: "Servicios y tarifas", icon: "tag" },
  { href: "/panel/disponibilidad", label: "Disponibilidad", icon: "clock" }
] as const;

function Icon({ name }: { name: string }) {
  const paths: Record<string, string> = { grid: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z", tag: "M20 13 13 20l-9-9V4h7l9 9Z M7.5 7.5h.01", clock: "M12 7v5l3 2 M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" };
  return <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" viewBox="0 0 24 24"><path d={paths[name]} /></svg>;
}

export function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  return <div className="min-h-screen bg-[var(--surface-sunken)] lg:pl-64">
    <aside className="panel-sidebar fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-[var(--line)] lg:flex">
      <div className="border-b border-[var(--line)] p-5"><Link href="/panel" className="display text-[30px] leading-none">nítida<span className="text-[var(--accent)]">.</span></Link><p className="mt-3 text-[10px] font-semibold uppercase tracking-[.08em] text-[var(--accent)]">Agenda inteligente</p></div>
      <nav className="flex-1 space-y-1 p-4"><p className="mb-3 px-3 text-[12px] font-semibold uppercase tracking-[.08em] text-[var(--ink-muted)]">Gestión</p>{navigation.map((item) => <Link key={item.href} href={item.href} data-active={pathname === item.href} className="flex items-center gap-3 rounded px-3 py-3 text-sm transition"><Icon name={item.icon} />{item.label}</Link>)}</nav>
      <div className="border-t border-[var(--line)] p-4"><div className="flex items-center gap-3 rounded-lg bg-[var(--surface-sunken)] p-3"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-bold text-[var(--on-accent)]">CN</div><div className="min-w-0"><p className="truncate text-sm font-medium">Casa Nómada</p><p className="truncate text-[13px] text-[var(--ink-muted)]">Profesional</p></div></div><p className="mt-4 text-[12px] leading-4 text-[var(--ink-muted)]">Finanzas que evolucionan,<br />tecnología que impulsa</p></div>
    </aside>
    <div className="border-b border-[var(--line)] bg-[var(--surface-raised)] px-5 py-3 lg:hidden"><div className="flex items-center justify-between"><Link href="/panel" className="display text-[24px] leading-none">nítida<span className="text-[var(--accent)]">.</span></Link><span className="text-xs font-semibold uppercase tracking-[.08em] text-[var(--accent)]">Agenda</span></div></div>
    {children}
  </div>;
}
