import { apiJson, authenticateAgent } from "../../../../lib/agent-api";
import { prisma } from "../../../../lib/prisma";
import { WEEKDAYS, WEEK_ORDER, formatMoney, todayInZone } from "../../../../lib/time";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await authenticateAgent(request);
  if ("response" in auth) return auth.response;
  const { organization } = auth;
  const [availability, services] = await Promise.all([
    prisma.weeklyAvailability.findMany({ where: { organizationId: organization.id } }),
    prisma.service.findMany({ where: { organizationId: organization.id, active: true }, orderBy: { createdAt: "asc" } })
  ]);
  return apiJson({
    name: organization.name,
    address: organization.address,
    phone: organization.phone,
    timezone: organization.timezone,
    today: todayInZone(organization.timezone),
    bookingUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/b/${organization.slug}`,
    schedule: WEEK_ORDER.map((weekday) => {
      const day = availability.find((d) => d.weekday === weekday);
      return day ? { weekday: WEEKDAYS[weekday], open: true, startsAt: day.startsAt, endsAt: day.endsAt, breakStartsAt: day.breakStartsAt, breakEndsAt: day.breakEndsAt } : { weekday: WEEKDAYS[weekday], open: false };
    }),
    services: services.map((service) => ({ id: service.id, name: service.name, description: service.description, durationMinutes: service.durationMinutes, price: service.priceInCents / 100, priceLabel: formatMoney(service.priceInCents, service.currency), currency: service.currency }))
  });
}
