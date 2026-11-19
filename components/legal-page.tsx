import Link from "next/link";
import { formatColombianPhone, supportWhatsapp } from "../lib/billing";

// Plantilla de las páginas legales de la plataforma (/privacidad, /terminos, /eliminacion-de-datos).
export const LEGAL_VERSION_DATE = "19 de noviembre de 2026";

export function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="mt-8"><h2 className="text-[18px] font-semibold">{title}</h2><div className="mt-3 space-y-3 text-[15px] leading-7 text-[var(--ink-muted)]">{children}</div></section>;
}

export function supportContact() {
  return `WhatsApp ${formatColombianPhone(supportWhatsapp())}`;
}

const links = [["/privacidad", "Política de privacidad"], ["/terminos", "Términos del servicio"], ["/eliminacion-de-datos", "Eliminación de datos"]] as const;

export function LegalPage({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return <main className="min-h-screen bg-[var(--surface-sunken)] px-4 py-10">
    <div className="mx-auto mb-6 max-w-2xl"><Link href="/" className="text-sm font-semibold text-[var(--accent)]">← Volver al inicio</Link></div>
    <article className="mx-auto max-w-2xl rounded-[10px] border border-[var(--line)] bg-[var(--surface-raised)] p-6 sm:p-10">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="display mt-3 text-[32px] leading-[1.1] sm:text-[40px]">{title}</h1>
      <p className="mt-3 text-[13px] text-[var(--ink-muted)]">Vigente desde el {LEGAL_VERSION_DATE}.</p>
      {children}
      <nav aria-label="Documentos legales" className="mt-10 flex flex-wrap gap-x-6 gap-y-2 border-t border-[var(--line)] pt-6 text-sm">
        {links.map(([href, label]) => <Link key={href} href={href} className="font-semibold text-[var(--accent)]">{label}</Link>)}
      </nav>
    </article>
  </main>;
}

export function LegalFooterLinks() {
  return <p className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1">{links.map(([href, label]) => <Link key={href} href={href} className="underline">{label}</Link>)}</p>;
}
