export type BusinessTheme = "barbershop" | "beauty";
export type AccountRole = "professional" | "client" | "platform_admin";

export type Service = {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
  priceInCents: number;
  currency: string;
  active: boolean;
};

export type WeeklyAvailability = {
  weekday: number;
  startsAt: string;
  endsAt: string;
  breakStartsAt?: string;
  breakEndsAt?: string;
};
