"use client";

import { useActionState, useState } from "react";
import { reviewSupportContribution } from "@/app/admin/support-actions";

export default function SupportReviewForm({ id, revision, amount, note, status }: { id: string; revision: number; amount: number; note: string | null; status: string }) {
  const [state, action, pending] = useActionState(reviewSupportContribution, {});
  const [verified, setVerified] = useState(false);
  return <form action={action} className="mt-4 grid gap-4 border-t border-[var(--admin-line)] pt-4">
    <input type="hidden" name="id" value={id} /><input type="hidden" name="revision" value={revision} />
    <label className="grid gap-2 text-xs font-semibold">Monto recibido en MXN<input className="admin-field min-h-11 rounded-lg border p-3" name="amount" type="text" inputMode="decimal" defaultValue={(amount / 100).toFixed(2)} required maxLength={9} /></label>
    <label className="grid gap-2 text-xs font-semibold">Nota privada de revisión<textarea className="admin-field min-h-20 rounded-lg border p-3" name="note" maxLength={1000} defaultValue={note ?? ""} placeholder="Cómo se verificó o por qué se rechaza" /></label>
    <label className="flex items-start gap-3 text-sm leading-6"><input className="mt-1 h-4 w-4 shrink-0 accent-lime-300" type="checkbox" name="verified" checked={verified} onChange={(e) => setVerified(e.target.checked)} /> Comprobé el identificador y el monto en la cuenta receptora. No basta con este aviso.</label>
    <div className="flex flex-wrap gap-2"><button className="admin-button admin-primary min-h-11 px-4 text-sm font-bold disabled:opacity-40" name="status" value="confirmed" disabled={pending || !verified}>{pending ? "Guardando…" : status === "confirmed" ? "Guardar revisión" : "Confirmar aporte"}</button>
      <button className="admin-button min-h-11 px-4 text-sm font-semibold disabled:opacity-40" name="status" value="rejected" disabled={pending}>{status === "confirmed" ? "Retirar reconocimiento" : "Rechazar aviso"}</button></div>
    {state.error && <p role="alert" className="text-sm text-amber-200">{state.error}</p>}{state.success && <p role="status" className="text-sm text-lime-200">{state.success}</p>}
  </form>;
}
