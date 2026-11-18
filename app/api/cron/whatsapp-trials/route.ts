import { disconnectExpiredTrials } from "../../../../lib/whatsapp-access";

// Tarea diaria (vercel.json → crons): desconecta los números de WhatsApp de las pruebas gratis que ya terminaron.
// Solo afecta pruebas vencidas, así que repetirla no hace daño. Si existe CRON_SECRET, Vercel la llama con
// "Authorization: Bearer <CRON_SECRET>" y se exige.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Unauthorized", { status: 401 });
  const disconnected = await disconnectExpiredTrials();
  return Response.json({ disconnected });
}
