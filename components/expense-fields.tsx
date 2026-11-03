"use client";

import { useEffect, useRef, useState } from "react";
import { fieldClass } from "./panel-ui";

const money = (value: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value);

// Campos del gasto; el total (cantidad × valor de la compra) se calcula al escribir.
export function ExpenseFields({ today }: { today: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("");

  useEffect(() => {
    const form = ref.current?.closest("form");
    const onReset = () => { setQuantity("1"); setUnitPrice(""); };
    form?.addEventListener("reset", onReset);
    return () => form?.removeEventListener("reset", onReset);
  }, []);

  const qty = Number(quantity.replace(",", "."));
  const price = Number(unitPrice.replace(/[^\d]/g, ""));
  const total = Number.isFinite(qty) && qty > 0 && price > 0 ? Math.round(qty * price) : 0;

  return <div ref={ref} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    <label className="block text-sm font-medium">Fecha<input name="date" type="date" required defaultValue={today} className={fieldClass} /><span className="mt-1 block text-[12px] font-normal text-[var(--ink-muted)]">dd-mm-aaaa</span></label>
    <label className="block text-sm font-medium sm:col-span-1 lg:col-span-2">Descripción<input name="description" required minLength={2} maxLength={200} placeholder="Cuchillas desechables" className={fieldClass} /></label>
    <label className="block text-sm font-medium">Cantidad<input name="quantity" type="number" required min="0.01" step="0.01" value={quantity} onChange={(event) => setQuantity(event.target.value)} className={fieldClass} /></label>
    <label className="block text-sm font-medium">Valor de la compra<input name="unitPrice" type="number" required min="1" step="1" inputMode="numeric" value={unitPrice} onChange={(event) => setUnitPrice(event.target.value)} placeholder="25000" className={fieldClass} /></label>
    <div className="text-sm font-medium">Total<p className="tabular mt-2 rounded border border-[var(--line)] bg-[var(--surface-sunken)] px-3 py-2.5 text-sm font-semibold text-[var(--accent)]">{money(total)}</p><span className="mt-1 block text-[12px] font-normal text-[var(--ink-muted)]">Cantidad × valor de la compra</span></div>
    <label className="block text-sm font-medium">Proveedor<input name="supplier" required minLength={2} maxLength={120} placeholder="Distribuidora El Barbero" className={fieldClass} /></label>
    <label className="block text-sm font-medium">Responsable<input name="responsible" required minLength={2} maxLength={120} placeholder="Nombre de quien compró" className={fieldClass} /></label>
  </div>;
}
