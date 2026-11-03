"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Vuelve a pedir los datos del servidor cada cierto tiempo y al regresar a la pestaña, para que la agenda esté al día.
export function AutoRefresh({ seconds = 30 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === "visible") router.refresh(); };
    const timer = window.setInterval(refresh, seconds * 1000);
    document.addEventListener("visibilitychange", refresh);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", refresh); };
  }, [router, seconds]);
  return null;
}
