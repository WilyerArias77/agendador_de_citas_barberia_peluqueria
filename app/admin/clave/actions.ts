"use server";

import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { isVerifiedPlatformAdmin } from "../../../lib/billing";
import { requireSession } from "../../../lib/organization";
import { OWNER_COOKIE, OWNER_UNLOCK_HOURS, checkOwnerKey, ownerUnlockToken } from "../../../lib/owner-key";
import { isRateLimited } from "../../../lib/rate-limit";

const SAFE_NEXT = new Set(["/admin/pagos", "/admin/whatsapp"]);

export async function unlockOwner(_: { error?: string }, formData: FormData): Promise<{ error?: string }> {
  const session = await requireSession();
  if (!isVerifiedPlatformAdmin(session.user)) notFound();
  if (await isRateLimited(`owner-key:${session.user.id}`, 5, 900)) return { error: "Demasiados intentos. Espera 15 minutos." };
  if (!checkOwnerKey(String(formData.get("key") ?? ""))) return { error: "Clave incorrecta." };
  (await cookies()).set(OWNER_COOKIE, ownerUnlockToken(session.user.id), { httpOnly: true, secure: true, sameSite: "strict", path: "/admin", maxAge: OWNER_UNLOCK_HOURS * 3600 });
  const next = String(formData.get("next") ?? "");
  redirect(SAFE_NEXT.has(next) ? (next as "/admin/pagos") : "/admin/pagos");
}

export async function lockOwner() {
  (await cookies()).delete({ name: OWNER_COOKIE, path: "/admin" });
  redirect("/panel");
}
