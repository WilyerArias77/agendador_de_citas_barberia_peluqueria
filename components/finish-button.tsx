"use client";

import { useState } from "react";

// Los navegadores solo dejan cerrar pestañas abiertas por script; si no se cierra, se muestra la despedida.
export function FinishButton({ businessName }: { businessName: string }) {
  const [done, setDone] = useState(false);

  function finish() {
    window.close();
    window.setTimeout(() => setDone(true), 200);
  }

  return <>
    <button type="button" onClick={finish} className="h-11 flex-1 rounded-[10px] border border-[var(--line)] px-4 text-sm font-semibold hover:border-[var(--accent)]">Terminar</button>
    {done && <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--surface-sunken)] px-5 text-center">
      <div><p className="eyebrow">Reserva lista</p><h2 className="display mt-3 text-[34px] leading-[1.1]">¡Gracias por reservar en {businessName}!</h2><p className="mt-3 text-[var(--ink-muted)]">Ya puedes cerrar esta página.</p></div>
    </div>}
  </>;
}
