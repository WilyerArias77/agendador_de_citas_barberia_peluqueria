"use client";

import { useState } from "react";

export function CopyButton({ value, label = "Copiar enlace" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { window.prompt("Copia el enlace:", value); }
  }
  return <button type="button" onClick={copy} className="h-10 rounded-[10px] bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--on-accent)]">{copied ? "¡Copiado!" : label}</button>;
}
