import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "../../lib/auth";
import { AppShell } from "../../components/app-shell";

export default async function PanelLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) redirect("/acceso?redirectedFrom=/panel");
  return <AppShell>{children}</AppShell>;
}
