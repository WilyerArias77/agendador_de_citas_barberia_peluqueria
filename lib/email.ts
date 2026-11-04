import { prisma } from "./prisma";
import { phonesMatch } from "./booking";
import { formatLongDate, formatMoney, formatTime } from "./time";

// Correos transaccionales con Resend (API HTTP, sin dependencias). Sin RESEND_API_KEY no se envía nada.

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string) {
  return EMAIL_PATTERN.test(value);
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);
}

export async function sendEmail({ to, subject, html, replyTo }: { to: string; subject: string; html: string; replyTo?: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !isValidEmail(to)) return false;
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.EMAIL_FROM || "Agenda <onboarding@resend.dev>", to: [to], subject, html, ...(replyTo ? { reply_to: replyTo } : {}) }),
      signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) console.error("Resend:", response.status, await response.text());
    return response.ok;
  } catch (error) {
    console.error("No se pudo enviar el correo:", error);
    return false;
  }
}

export type BookingEmailKind = "created" | "rescheduled" | "cancelled";

const COPY: Record<BookingEmailKind, { subject: string; title: string; intro: string }> = {
  created: { subject: "Tu cita quedó agendada", title: "¡Tu cita está confirmada!", intro: "Agendamos tu cita con estos datos:" },
  rescheduled: { subject: "Tu cita fue reprogramada", title: "Tu cita cambió de horario", intro: "Tu cita quedó reprogramada. Estos son los nuevos datos:" },
  cancelled: { subject: "Tu cita fue cancelada", title: "Tu cita fue cancelada", intro: "Te confirmamos que esta cita fue cancelada:" }
};

// Correo de la cita al cliente. Si la cita no tiene correo, se busca en la base de clientes por celular.
export async function sendBookingEmail(bookingId: string, kind: BookingEmailKind) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId }, include: { service: true, barber: true, organization: true } });
  if (!booking) return false;
  let to = booking.customerEmail;
  if (!isValidEmail(to)) {
    const customers = await prisma.customer.findMany({ where: { organizationId: booking.organizationId }, select: { phone: true, email: true } });
    to = customers.find((customer) => phonesMatch(customer.phone, booking.customerPhone))?.email ?? "";
  }
  if (!isValidEmail(to)) return false;

  const org = booking.organization;
  const tz = org.timezone;
  const copy = COPY[kind];
  const rows: [string, string][] = [
    ["Servicio", booking.service.name],
    ["Fecha", formatLongDate(booking.startsAt, tz)],
    ["Hora", formatTime(booking.startsAt, tz)],
    ...(booking.barber ? [["Barbero", booking.barber.name] as [string, string]] : []),
    ["Valor", formatMoney(booking.priceInCents, booking.service.currency)],
    ...(org.address ? [["Dirección", org.address] as [string, string]] : [])
  ];
  const html = `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#1a1a1a">
  <p style="font-size:13px;color:#888;text-transform:uppercase;letter-spacing:.08em;margin:0">${escapeHtml(org.name)}</p>
  <h1 style="font-size:22px;margin:8px 0 12px">${copy.title}</h1>
  <p style="font-size:15px">Hola ${escapeHtml(booking.customerName.split(" ")[0])}, ${copy.intro}</p>
  <table style="width:100%;border-collapse:collapse;font-size:14px;${kind === "cancelled" ? "text-decoration:line-through;color:#777;" : ""}">
    ${rows.map(([label, value]) => `<tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#777">${label}</td><td style="padding:8px 0;border-bottom:1px solid #eee;font-weight:bold;text-align:right">${escapeHtml(value)}</td></tr>`).join("")}
  </table>
  <p style="font-size:14px;margin-top:20px">${kind === "cancelled" ? "Si quieres agendar de nuevo, contáctanos." : "Si necesitas cambiar o cancelar tu cita, contáctanos."}${org.phone ? ` WhatsApp: ${escapeHtml(org.phone)}` : ""}</p>
</div>`;
  return sendEmail({ to, subject: `${copy.subject} · ${org.name}`, html });
}

// Correo simple con un botón (verificación de cuenta, recuperación de contraseña).
export function actionEmailHtml({ title, intro, buttonLabel, url, footer }: { title: string; intro: string; buttonLabel: string; url: string; footer: string }) {
  return `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#1a1a1a">
  <p style="font-size:13px;color:#888;text-transform:uppercase;letter-spacing:.08em;margin:0">Growing Solutions · Agenda</p>
  <h1 style="font-size:22px;margin:8px 0 12px">${escapeHtml(title)}</h1>
  <p style="font-size:15px">${escapeHtml(intro)}</p>
  <p style="margin:24px 0"><a href="${escapeHtml(url)}" style="background:#c9a45c;color:#111;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:bold;display:inline-block">${escapeHtml(buttonLabel)}</a></p>
  <p style="font-size:12px;color:#777">Si el botón no funciona, copia este enlace en tu navegador:<br>${escapeHtml(url)}</p>
  <p style="font-size:12px;color:#777">${escapeHtml(footer)}</p>
</div>`;
}
