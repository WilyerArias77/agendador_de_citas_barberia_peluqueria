import { Logo } from "./logo";

type Props = { eyebrow: string; heroTitle: string; children: React.ReactNode };

export function AuthLayout({ eyebrow, heroTitle, children }: Props) {
  return <main className="grid min-h-screen lg:grid-cols-[.72fr_1fr]">
    <section className="relative hidden overflow-hidden bg-[var(--surface-sunken)] p-12 lg:flex lg:flex-col lg:justify-between">
      <div className="stripe-mark absolute right-0 top-0 h-full w-20 opacity-80" />
      <Logo variant="full" className="relative h-40" />
      <div className="relative max-w-md"><p className="eyebrow">{eyebrow}</p><h1 className="display mt-4 text-[40px] leading-[1.1]">{heroTitle}</h1></div>
      <p className="relative text-xs text-[var(--ink-muted)]">Reservas para trabajar mejor.</p>
    </section>
    <section className="flex items-center justify-center bg-[var(--surface)] px-6 py-12">
      <div className="w-full max-w-md rounded-[10px] border border-[var(--line)] bg-[var(--surface-raised)] p-8 sm:p-10">
        <Logo className="h-12 lg:hidden" />
        {children}
      </div>
    </section>
  </main>;
}

export const authInputClass = "mt-2 w-full rounded border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-[var(--ink)] outline-none transition focus:border-[var(--accent)]";
