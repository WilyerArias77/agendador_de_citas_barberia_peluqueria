import { apiError, apiJson, authenticateAgent } from "../../../../lib/agent-api";
import { getAvailableSlots } from "../../../../lib/booking";
import { addDays, formatDateStr, isValidDate } from "../../../../lib/time";

export const dynamic = "force-dynamic";

// ?serviceId=…&date=YYYY-MM-DD[&days=1..7] — con days > 1 devuelve varios días seguidos.
export async function GET(request: Request) {
  const auth = await authenticateAgent(request);
  if ("response" in auth) return auth.response;
  const { searchParams } = new URL(request.url);
  const serviceId = searchParams.get("serviceId") ?? "";
  const date = searchParams.get("date") ?? "";
  const days = Math.min(7, Math.max(1, Number(searchParams.get("days")) || 1));
  if (!serviceId) return apiError("Falta serviceId.", 400);
  if (!isValidDate(date)) return apiError("La fecha debe tener formato YYYY-MM-DD.", 400);
  const { id: organizationId, timezone } = auth.organization;
  const results = await Promise.all(Array.from({ length: days }, async (_, index) => {
    const day = addDays(date, index);
    return { date: day, label: formatDateStr(day), slots: await getAvailableSlots({ organizationId, timezone, serviceId, date: day }) };
  }));
  return apiJson(days === 1 ? results[0] : { days: results });
}
