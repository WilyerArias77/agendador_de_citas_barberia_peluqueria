/* eslint-disable @next/next/no-img-element */
import { whatsappLink } from "../lib/whatsapp";

type Props = { phone: string; message?: string; variant?: "floating" | "inline"; label?: string };

function WhatsappIcon({ className = "h-5 w-5" }: { className?: string }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="currentColor"><path d="M12.04 2a9.9 9.9 0 0 0-8.5 15l-1.4 5 5.2-1.36A9.9 9.9 0 1 0 12.04 2Zm0 18.1a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.08.81.82-3-.2-.31a8.2 8.2 0 1 1 6.94 3.83Zm4.5-6.14c-.25-.12-1.46-.72-1.69-.8-.23-.08-.39-.12-.56.13-.16.25-.64.8-.79.97-.14.16-.29.18-.54.06a6.7 6.7 0 0 1-3.32-2.9c-.25-.43.25-.4.71-1.33.08-.16.04-.3-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.41-.56-.42h-.48a.92.92 0 0 0-.66.31 2.8 2.8 0 0 0-.87 2.07 4.8 4.8 0 0 0 1 2.56 11 11 0 0 0 4.24 3.74c1.58.68 2.2.74 2.99.62.48-.07 1.46-.6 1.67-1.18.2-.58.2-1.07.14-1.18-.06-.1-.22-.16-.47-.28Z" /></svg>;
}

// El botón flotante es el barbero de la marca: abre el chat de WhatsApp donde responde el agente (n8n).
export function WhatsappButton({ phone, message, variant = "floating", label = "Escríbenos por WhatsApp" }: Props) {
  const href = whatsappLink(phone, message);
  if (!href) return null;
  if (variant === "inline") {
    return <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center justify-center gap-2 rounded-[10px] bg-[#25D366] px-5 text-sm font-semibold text-[#0b2e17]"><WhatsappIcon />{label}</a>;
  }
  return <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className="group fixed bottom-5 right-5 z-30 flex items-end gap-2">
    <span className="mb-3 hidden rounded-[10px] bg-[var(--surface-raised)] px-3 py-2 text-[13px] font-semibold text-[var(--ink)] shadow-lg shadow-black/30 ring-1 ring-[var(--line)] sm:block">¿Agendamos tu cita? 💈</span>
    <span className="relative block h-[72px] w-[72px] transition group-hover:scale-105">
      <img src="/barbero-whatsapp.png" alt="" width={72} height={72} className="h-full w-full rounded-full shadow-lg shadow-black/40 ring-2 ring-[#25D366]" />
      <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-[#25D366] text-white ring-2 ring-[var(--surface)]"><WhatsappIcon className="h-4 w-4" /></span>
    </span>
  </a>;
}
