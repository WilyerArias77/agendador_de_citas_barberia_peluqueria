// Convierte un teléfono del negocio en enlace de WhatsApp (por defecto Colombia, +57).
export function whatsappLink(phone: string, message?: string) {
  let digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length === 10 && digits.startsWith("3")) digits = `57${digits}`;
  return `https://wa.me/${digits}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
}
