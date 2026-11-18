"use client";

/* eslint-disable @next/next/no-img-element */
import { FormEvent, Fragment, useEffect, useRef, useState } from "react";

// "Agente de citas": chat con apariencia de WhatsApp que acompaña al cliente en todas las páginas de la barbería.
// Al abrirlo por primera vez, el agente (n8n) saluda, presenta la barbería y ofrece agendar.

type Message = { from: "agent" | "customer"; text: string };
type Profile = { name: string; hasPhone: boolean };

const storageKey = (slug: string) => `gs-agent-chat:${slug}`;

function readSession(slug: string) {
  try { return window.localStorage.getItem(storageKey(slug)); } catch { return null; }
}
function writeSession(slug: string, value: string) {
  try { window.localStorage.setItem(storageKey(slug), value); } catch { /* sin almacenamiento: la sesión dura lo que la pestaña */ }
}

// Formato de WhatsApp: *negrita*, _cursiva_, saltos de línea y enlaces.
function RichText({ text }: { text: string }) {
  return <>{text.split("\n").map((line, i) => <Fragment key={i}>{i > 0 && <br />}{line.split(/(https?:\/\/[^\s]+|\*[^*\n]+\*|_[^_\n]+_)/g).map((part, j) => {
    if (/^https?:\/\//.test(part)) return <a key={j} href={part} target="_blank" rel="noopener noreferrer" className="break-all text-[#53bdeb] underline">{part}</a>;
    if (/^\*[^*]+\*$/.test(part)) return <strong key={j}>{part.slice(1, -1)}</strong>;
    if (/^_[^_]+_$/.test(part)) return <em key={j}>{part.slice(1, -1)}</em>;
    return <Fragment key={j}>{part}</Fragment>;
  })}</Fragment>)}</>;
}

export function AgentChat({ slug, businessName, policyUrl }: { slug: string; businessName: string; policyUrl: string }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [typing, setTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState("");
  const started = useRef(false);
  const bottom = useRef<HTMLDivElement>(null);

  async function call(payload: Record<string, unknown>) {
    const response = await fetch(`/api/chat/${encodeURIComponent(slug)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "No pudimos conectar con el agente. Intenta de nuevo.");
    return data;
  }

  async function start() {
    setTyping(true); setError(null);
    try {
      const data = await call({ action: "open", sessionId: readSession(slug) });
      writeSession(slug, data.sessionId);
      setSessionId(data.sessionId); setProfile(data.profile); setMessages(data.messages ?? []);
    } catch (e) {
      started.current = false;
      setError(e instanceof Error ? e.message : "No pudimos conectar con el agente.");
    } finally { setTyping(false); }
  }

  useEffect(() => {
    if (open && !started.current) { started.current = true; void start(); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, typing, profile, open]);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(null);
    const form = new FormData(event.currentTarget);
    try {
      const data = await call({ action: "profile", sessionId, name: form.get("name"), phone: form.get("phone") });
      setProfile(data.profile);
    } catch (e) { setError(e instanceof Error ? e.message : "No pudimos guardar tus datos."); }
  }

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = text.trim();
    if (!value || typing) return;
    setText(""); setError(null);
    setMessages((list) => [...list, { from: "customer", text: value }]);
    setTyping(true);
    try {
      const data = await call({ action: "message", sessionId, text: value });
      setMessages((list) => [...list, ...(data.messages ?? [])]);
    } catch (e) { setError(e instanceof Error ? e.message : "No pudimos enviar tu mensaje."); }
    finally { setTyping(false); }
  }

  const inputClass = "w-full rounded-full bg-[#2a3942] px-4 py-2.5 text-[14px] text-[#e9edef] placeholder:text-[#8696a0] outline-none";

  return <>
    {!open && <button type="button" onClick={() => setOpen(true)} aria-label={`Hablar con el Agente de citas de ${businessName}`} className="group fixed bottom-5 right-5 z-40 flex items-end gap-2">
      <span className="mb-3 hidden rounded-[10px] bg-[var(--surface-raised)] px-3 py-2 text-[13px] font-semibold text-[var(--ink)] shadow-lg shadow-black/30 ring-1 ring-[var(--line)] sm:block">¿Agendamos tu cita? 💈</span>
      <span className="relative block h-[72px] w-[72px] transition group-hover:scale-105">
        <img src="/barbero-whatsapp.png" alt="" width={72} height={72} className="h-full w-full rounded-full shadow-lg shadow-black/40 ring-2 ring-[#25D366]" />
        <span className="absolute -right-0.5 -top-0.5 h-4 w-4 rounded-full bg-[#25D366] ring-2 ring-[var(--surface)]" />
      </span>
    </button>}

    {open && <section role="dialog" aria-label="Chat con el Agente de citas" className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-[#0b141a] shadow-2xl shadow-black/60 sm:inset-auto sm:bottom-5 sm:right-5 sm:h-[600px] sm:max-h-[calc(100vh-40px)] sm:w-[380px] sm:rounded-[14px]">
      <header className="flex items-center gap-3 bg-[#202c33] px-3 py-2.5">
        <img src="/barbero-whatsapp.png" alt="" width={40} height={40} className="h-10 w-10 rounded-full" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold text-[#e9edef]">Agente de citas</p>
          <p className="truncate text-[12px] text-[#8696a0]">{typing ? "escribiendo…" : `${businessName} · en línea`}</p>
        </div>
        <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar chat" className="flex h-9 w-9 items-center justify-center rounded-full text-[#aebac1] hover:bg-white/10">✕</button>
      </header>

      <div className="flex-1 space-y-2 overflow-y-auto px-3 py-4" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,.035) 1px, transparent 1px)", backgroundSize: "18px 18px" }}>
        <p className="mx-auto w-fit rounded-md bg-[#182229] px-3 py-1 text-center text-[11px] text-[#8696a0]">🔒 Chat con el asistente de {businessName}</p>
        {messages.map((message, index) => <div key={index} className={`flex ${message.from === "customer" ? "justify-end" : "justify-start"}`}>
          <p className={`max-w-[85%] whitespace-pre-wrap break-words rounded-lg px-3 py-2 text-[14px] leading-[1.4] text-[#e9edef] shadow ${message.from === "customer" ? "rounded-tr-none bg-[#005c4b]" : "rounded-tl-none bg-[#202c33]"}`}><RichText text={message.text} /></p>
        </div>)}
        {typing && <div className="flex justify-start"><p className="rounded-lg rounded-tl-none bg-[#202c33] px-4 py-3 text-[#8696a0]"><span className="inline-flex gap-1"><span className="h-2 w-2 animate-bounce rounded-full bg-current" /><span className="h-2 w-2 animate-bounce rounded-full bg-current [animation-delay:.15s]" /><span className="h-2 w-2 animate-bounce rounded-full bg-current [animation-delay:.3s]" /></span></p></div>}
        {error && <p role="alert" className="mx-auto max-w-[90%] rounded-md bg-[#3b1f24] px-3 py-2 text-center text-[13px] text-[#f1a7b0]">{error}{!sessionId && <> <button type="button" onClick={() => { started.current = true; void start(); }} className="font-semibold underline">Reintentar</button></>}</p>}
        <div ref={bottom} />
      </div>

      {sessionId && profile && !profile.hasPhone ? <form onSubmit={saveProfile} className="space-y-2 bg-[#202c33] p-3">
        <p className="text-[13px] text-[#e9edef]">Para atenderte y agendar a tu nombre, cuéntame:</p>
        <input name="name" required minLength={2} maxLength={80} autoComplete="name" placeholder="Tu nombre" className={inputClass} />
        <input name="phone" required type="tel" inputMode="tel" maxLength={20} autoComplete="tel" placeholder="Tu WhatsApp (300 123 4567)" className={inputClass} />
        <p className="text-[11px] text-[#8696a0]">Usamos tus datos solo para gestionar tus citas con {businessName}. <a href={policyUrl} target="_blank" rel="noopener noreferrer" className="underline">Política de datos</a>.</p>
        <button type="submit" className="h-10 w-full rounded-full bg-[#00a884] text-[14px] font-semibold text-[#0b141a]">Continuar</button>
      </form>
        : <form onSubmit={send} className="flex items-center gap-2 bg-[#202c33] p-2.5">
          <input value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} disabled={!sessionId} placeholder={sessionId ? "Escribe un mensaje" : "Conectando…"} aria-label="Mensaje" className={inputClass} />
          <button type="submit" disabled={!text.trim() || typing || !sessionId} aria-label="Enviar" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#00a884] text-[#0b141a] disabled:opacity-50"><svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M3.4 20.4 21 12 3.4 3.6 3.4 10l12.6 2-12.6 2z" /></svg></button>
        </form>}
    </section>}
  </>;
}
