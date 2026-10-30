"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./logo";
import { SignOutButton } from "./sign-out-button";

const navigation = [
  { href: "/panel", label: "Inicio", icon: "grid" },
  { href: "/panel/citas", label: "Citas", icon: "calendar" },
  { href: "/panel/servicios", label: "Servicios y tarifas", icon: "tag" },
  { href: "/panel/disponibilidad", label: "Disponibilidad", icon: "clock" },
  { href: "/panel/negocio", label: "Mi negocio", icon: "store" }
] as const;

function Icon({ name }: { name: string }) {
  const paths: Record<string, string> = { grid: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z", tag: "M20 13 13 20l-9-9V4h7l9 9Z M7.5 7.5h.01", clock: "M12 7v5l3 2 M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z", calendar: "M8 3v4M16 3v4M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z", store: "M4 10v10h16V10M3 6l2-3h14l2 3v2a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0Z M10 20v-5h4v5" };
  return <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" viewBox="0 0 24 24"><path d={paths[name]} /></svg>;
}

type Props = { children: React.ReactNode; organizationName: string; userName: string; publicUrl: string; trialDaysLeft: number | null };

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]?.toUpperCase()).join("") || "N";
}

export function AppShell({ children, organizationName, userName, publicUrl, trialDaysLeft }: Readonly<Props>) {
  const pathname = usePathname();
  const isActive = (href: string) => href === "/panel" ? pathname === href : pathname.startsWith(href);

  return <div className="min-h-screen bg-[var(--surface-sunken)] lg:pl-64">
    <aside className="panel-sidebar fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-[var(--line)] lg:flex">
      <div className="border-b border-[var(--line)] p-5"><Logo href="/panel" className="h-14" /><p className="mt-3 text-[10px] font-semibold uppercase tracking-[.08em] text-[var(--accent)]">Agenda inteligente</p></div>
      <nav className="flex-1 space-y-1 p-4"><p className="mb-3 px-3 text-[12px] font-semibold uppercase tracking-[.08em] text-[var(--ink-muted)]">Gestión</p>{navigation.map((item) => <Link key={item.href} href={item.href} data-active={isActive(item.href)} className="flex items-center gap-3 rounded px-3 py-3 text-sm transition"><Icon name={item.icon} />{item.label}</Link>)}
        <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="mt-4 flex items-center gap-3 rounded px-3 py-3 text-sm transition"><svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" viewBox="0 0 24 24"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></svg>Mi página de reservas</a>
      </nav>
      <div className="border-t border-[var(--line)] p-4">
        <div className="flex items-center gap-3 rounded-lg bg-[var(--surface-sunken)] p-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-bold text-[var(--on-accent)]">{initials(organizationName)}</div><div className="min-w-0"><p className="truncate text-sm font-medium">{organizationName}</p><p className="truncate text-[13px] text-[var(--ink-muted)]">{userName}</p></div></div>
        <SignOutButton className="mt-3 w-full rounded px-3 py-2 text-left text-[13px] text-[var(--ink-muted)] hover:text-[var(--accent)]" />
      </div>
    </aside>

    <div className="sticky top-0 z-20 border-b border-[var(--line)] bg-[var(--surface-raised)] lg:hidden">
      <div className="flex items-center justify-between px-5 py-3"><Logo href="/panel" className="h-10" /><SignOutButton className="text-[13px] text-[var(--ink-muted)]" /></div>
      <nav className="flex gap-1 overflow-x-auto px-3 pb-2">{navigation.map((item) => <Link key={item.href} href={item.href} className={`flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-[13px] ${isActive(item.href) ? "bg-[var(--accent)] text-[var(--on-accent)]" : "text-[var(--ink-muted)]"}`}><Icon name={item.icon} />{item.label}</Link>)}</nav>
    </div>

    {trialDaysLeft !== null && <div className="border-b border-[var(--line)] bg-[var(--accent-soft)] px-6 py-2.5 text-center text-[13px] lg:px-8">Prueba gratis: {trialDaysLeft === 0 ? "termina hoy" : trialDaysLeft === 1 ? "te queda 1 día" : `te quedan ${trialDaysLeft} días`}.</div>}
    {children}
  </div>;
}
