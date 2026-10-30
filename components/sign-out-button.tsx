"use client";

import { useState } from "react";
import { authClient } from "../lib/auth-client";

export function SignOutButton({ className }: { className?: string }) {
  const [pending, setPending] = useState(false);
  async function signOut() {
    setPending(true);
    try { await authClient.signOut(); } finally { window.location.assign("/acceso"); }
  }
  return <button type="button" onClick={signOut} disabled={pending} className={className}>{pending ? "Saliendo…" : "Cerrar sesión"}</button>;
}
