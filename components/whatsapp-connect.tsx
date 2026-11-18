"use client";

import { useEffect, useRef, useState } from "react";
import { connectWhatsApp } from "../app/panel/whatsapp-actions";

// Registro integrado de Meta (Embedded Signup): el dueño entra con Facebook, elige su cuenta de WhatsApp Business
// y escanea un QR desde la app WhatsApp Business para conectarla (coexistencia). Meta también le deja usar un número nuevo:
// el evento final dice cuál de los dos caminos tomó.

type FacebookSdk = {
  init: (options: Record<string, unknown>) => void;
  login: (callback: (response: { authResponse?: { code?: string } | null }) => void, options: Record<string, unknown>) => void;
};
declare global {
  interface Window { FB?: FacebookSdk; fbAsyncInit?: () => void }
}

type Mode = "coexistence" | "cloud";
type Session = { wabaId: string; phoneNumberId?: string; mode: Mode };

function loadSdk(appId: string, graphVersion: string) {
  return new Promise<FacebookSdk>((resolve, reject) => {
    if (window.FB) return resolve(window.FB);
    window.fbAsyncInit = () => {
      window.FB!.init({ appId, autoLogAppEvents: true, xfbml: false, version: graphVersion });
      resolve(window.FB!);
    };
    const script = document.createElement("script");
    script.src = "https://connect.facebook.net/es_LA/sdk.js";
    script.async = true;
    script.defer = true;
    script.crossOrigin = "anonymous";
    script.onerror = () => reject(new Error("No se pudo cargar Facebook. Revisa tu conexión o desactiva el bloqueador de anuncios."));
    document.body.appendChild(script);
  });
}

export function WhatsAppConnect({ appId, configId, graphVersion, label }: { appId: string; configId: string; graphVersion: string; label: string }) {
  const [status, setStatus] = useState<"idle" | "waiting" | "saving">("idle");
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const code = useRef<string | null>(null);
  const session = useRef<Session | null>(null);

  async function finish() {
    if (!code.current || !session.current) return;
    const payload = { code: code.current, ...session.current };
    code.current = null;
    session.current = null;
    setStatus("saving");
    const result = await connectWhatsApp(payload);
    setStatus("idle");
    setMessage(result.error ? { type: "error", text: result.error } : { type: "success", text: result.success ?? "Conectado." });
  }

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (!/^https:\/\/([a-z0-9-]+\.)*facebook\.com$/.test(event.origin)) return;
      let data: { type?: string; event?: string; data?: { phone_number_id?: string; waba_id?: string; error_message?: string } };
      try {
        data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
      } catch {
        return;
      }
      if (data?.type !== "WA_EMBEDDED_SIGNUP") return;
      if (data.event === "CANCEL") {
        setStatus("idle");
        setMessage({ type: "error", text: "Cerraste la ventana de Meta antes de terminar. Vuelve a intentarlo cuando quieras." });
        return;
      }
      if (data.event === "ERROR") {
        setStatus("idle");
        setMessage({ type: "error", text: data.data?.error_message ?? "Meta reportó un error durante la conexión." });
        return;
      }
      if (data.event?.startsWith("FINISH") && data.data?.waba_id) {
        session.current = { wabaId: data.data.waba_id, phoneNumberId: data.data.phone_number_id, mode: data.event === "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING" ? "coexistence" : "cloud" };
        void finish();
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  async function start() {
    setMessage(null);
    setStatus("waiting");
    try {
      const FB = await loadSdk(appId, graphVersion);
      FB.login((response) => {
        if (!response.authResponse?.code) {
          setStatus("idle");
          setMessage({ type: "error", text: "No se completó la conexión con Meta. Si la ventana decía “La app no está activa”, la conexión con WhatsApp aún está en aprobación por parte de Meta: escríbenos a soporte y te avisamos cuando esté lista." });
          return;
        }
        code.current = response.authResponse.code;
        void finish();
      }, {
        config_id: configId,
        response_type: "code",
        override_default_response_type: true,
        extras: { setup: {}, sessionInfoVersion: "3", featureType: "whatsapp_business_app_onboarding" }
      });
    } catch (error) {
      setStatus("idle");
      setMessage({ type: "error", text: error instanceof Error ? error.message : "No se pudo abrir la ventana de Meta." });
    }
  }

  return <div className="mt-4 space-y-3">
    <button type="button" onClick={start} disabled={status !== "idle"} className="inline-flex min-h-11 items-center gap-2 rounded-[10px] bg-[#25D366] px-5 py-2 text-left text-sm font-semibold text-[#0b3d1f] disabled:opacity-60">
      {status === "waiting" ? "Siguiendo los pasos en Meta…" : status === "saving" ? "Conectando…" : label}
    </button>
    {message && <p role={message.type === "error" ? "alert" : "status"} className={`rounded border p-3 text-sm ${message.type === "error" ? "border-[var(--danger)]/40 bg-[var(--danger)]/10 text-[var(--danger)]" : "border-[var(--success)]/40 bg-[var(--success)]/10 text-[var(--success)]"}`}>{message.text}</p>}
  </div>;
}
