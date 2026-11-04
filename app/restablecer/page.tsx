import { ResetPasswordForm } from "./reset-form";

export const metadata = { title: "Nueva contraseña" };

export default async function ResetPasswordPage(props: { searchParams: Promise<{ token?: string; error?: string }> }) {
  const { token, error } = await props.searchParams;
  return <ResetPasswordForm token={error ? "" : token ?? ""} />;
}
