import { NextResponse } from "next/server";
import { getAvailableSlots } from "../../../lib/booking";
import { hasActiveAccess } from "../../../lib/organization";
import { prisma } from "../../../lib/prisma";
import { clientIp, isRateLimited } from "../../../lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // 60 consultas por minuto por IP: suficiente para reservar, frena a quien recorra los horarios en masa.
  if (await isRateLimited(`slots:${await clientIp(request.headers)}`, 60, 60)) return NextResponse.json({ slots: [], error: "Demasiadas consultas. Espera un momento." }, { status: 429, headers: { "Retry-After": "60" } });
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug") ?? "";
  const serviceId = searchParams.get("service") ?? "";
  const date = searchParams.get("date") ?? "";
  const barberId = searchParams.get("barber") || undefined;
  const organization = await prisma.organization.findUnique({ where: { slug } });
  if (!organization || !hasActiveAccess(organization)) return NextResponse.json({ slots: [] }, { status: 404 });
  const slots = await getAvailableSlots({ organizationId: organization.id, timezone: organization.timezone, serviceId, date, barberId });
  return NextResponse.json({ slots }, { headers: { "Cache-Control": "no-store" } });
}
