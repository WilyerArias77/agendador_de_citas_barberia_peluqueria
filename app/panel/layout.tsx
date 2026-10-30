import { redirect } from "next/navigation";
import { AppShell } from "../../components/app-shell";
import { hasActiveAccess, publicBookingUrl, requireOrganization, trialDaysLeft } from "../../lib/organization";

export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { session, organization } = await requireOrganization();
  if (!hasActiveAccess(organization)) redirect("/suscripcion");
  return <AppShell organizationName={organization.name} userName={session.user.name} publicUrl={publicBookingUrl(organization.slug)} trialDaysLeft={trialDaysLeft(organization)}>{children}</AppShell>;
}
