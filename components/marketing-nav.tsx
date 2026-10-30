import Link from "next/link";
import { ThemeSwitcher } from "./theme-switcher";

export function MarketingNav() {
  return (
    <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-5 lg:px-10">
      <Link href="/" className="flex items-center gap-3" aria-label="Nítida, inicio"><span className="display text-[28px] leading-none">nítida<span className="text-[var(--accent)]">.</span></span><span className="hidden border-l border-[var(--line)] pl-3 text-xs font-semibold uppercase tracking-[.18em] text-[var(--muted)] sm:block">Agenda inteligente</span></Link>
      <nav className="hidden items-center gap-8 text-sm text-[var(--muted)] md:flex">
        <a href="#beneficios">Funciones</a><a href="#experiencia">Experiencia</a><a href="#precios">Planes</a>
      </nav>
      <div className="flex items-center gap-3"><ThemeSwitcher /><Link href="/acceso" className="hidden text-sm font-medium text-[var(--ink-muted)] sm:block">Entrar</Link><Link href="/acceso" className="rounded-[10px] bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--on-accent)]">Comenzar</Link></div>
    </header>
  );
}
