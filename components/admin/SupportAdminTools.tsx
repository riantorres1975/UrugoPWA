"use client";

import { startTransition, useActionState, useRef, useState, type FormEvent } from "react";
import { registerVerifiedSupport, saveSupportGoal, type SupportReviewState } from "@/app/admin/support-actions";
import { SUPPORT_METHODS, type SupportVisibility } from "@/lib/support-contributions";
import { createSupportCode } from "@/lib/support-management";
import SupportAccessTicket from "@/components/SupportAccessTicket";

export type SupportGoalEditor = { month: string; target_cents: number; description: string; enabled: boolean; revision: number };
const field = "admin-field mt-2 block w-full";
const submit = "admin-button admin-primary min-h-11 px-4 text-sm font-bold disabled:opacity-40";
function FormState({ state }: { state: SupportReviewState }) {
  return <>{state.error && <p role="alert" className="text-sm text-amber-200">{state.error}</p>}{state.success && <p role="status" className="text-sm text-lime-200">{state.success}</p>}</>;
}

export function ManualSupportForm() {
  const code = useRef<string | null>(null);
  const [state, action, pending] = useActionState(async (previous: SupportReviewState, form: FormData) => {
    code.current ??= createSupportCode(); form.set("accessCode", code.current);
    return registerVerifiedSupport(previous, form);
  }, {} as SupportReviewState);
  const [visibility, setVisibility] = useState<SupportVisibility>("anonymous");
  const [verified, setVerified] = useState(false);
  function submitForm(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); startTransition(() => action(form)); }
  return <details className="admin-card p-5"><summary className="cursor-pointer text-base font-bold">Registrar un pago recibido</summary>
    <p className="my-3 text-sm leading-6 text-[var(--admin-muted)]">Para apoyos reales que llegaron sin formulario. Comprueba el comprobante en la cuenta receptora. Se registra como anónimo y sin monto público salvo autorización.</p>
    {state.accessCode ? <><FormState state={state} /><SupportAccessTicket code={state.accessCode} /><p className="mt-3 text-xs text-[var(--admin-muted)]">Entrega el código únicamente a quien realizó el apoyo. Recarga la página para registrar otro pago.</p></> : <form onSubmit={submitForm} className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold">Medio de pago<select name="method" className={field} defaultValue="mercadopago">{Object.entries(SUPPORT_METHODS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
        <label className="text-xs font-semibold">Monto recibido en MXN<input name="amount" className={field} inputMode="decimal" type="text" maxLength={9} required placeholder="Importe del comprobante" /></label></div>
      <label className="text-xs font-semibold">Identificador privado del pago<input name="reference" className={field} required minLength={6} maxLength={120} autoComplete="off" /></label>
      <label className="text-xs font-semibold">Reconocimiento público<select name="visibility" className={field} value={visibility} onChange={(event) => setVisibility(event.target.value as SupportVisibility)}><option value="anonymous">Como anónimo</option><option value="named">Con nombre autorizado</option><option value="private">No aparecer</option></select></label>
      {visibility === "named" && <><label className="text-xs font-semibold">Nombre o seudónimo autorizado<input name="name" className={field} required minLength={2} maxLength={60} /></label><label className="flex items-start gap-2 text-sm leading-6"><input type="checkbox" name="nameConsent" required className="mt-1 shrink-0" /> La persona autorizó publicar este nombre. El nombre en el comprobante no cuenta como autorización.</label></>}
      {visibility !== "private" && <label className="flex items-start gap-2 text-sm leading-6"><input type="checkbox" name="showAmount" className="mt-1 shrink-0" /> La persona autorizó mostrar el monto públicamente.</label>}
      <label className="text-xs font-semibold">Cómo verificaste el pago<textarea name="note" className={field} minLength={8} maxLength={1000} required placeholder="Nota privada de comprobación" /></label>
      <label className="flex items-start gap-2 text-sm leading-6"><input type="checkbox" name="verified" required className="mt-1 shrink-0" checked={verified} onChange={(event) => setVerified(event.target.checked)} /> Comprobé que el pago y el monto se recibieron realmente.</label>
      <button className={submit} disabled={pending || !verified}>{pending ? "Registrando…" : "Registrar aporte verificado"}</button><FormState state={state} />
    </form>}
  </details>;
}

export function SupportGoalForm({ month, goal, unavailable }: { month: string; goal: SupportGoalEditor | null; unavailable: boolean }) {
  const [state, action, pending] = useActionState(saveSupportGoal, {});
  function submitForm(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); startTransition(() => action(form)); }
  return <details className="admin-card p-5"><summary className="cursor-pointer text-base font-bold">Meta mensual de mantenimiento</summary>
    <p className="my-3 text-sm leading-6 text-[var(--admin-muted)]">Define un importe basado en los gastos reales. No se inventa una meta. El avance público solo suma apoyos confirmados con monto visible.</p>
    <form method="get" className="mb-4 flex flex-wrap items-end gap-2"><label className="min-w-0 flex-1 text-xs font-semibold">Mes a configurar<input type="month" name="mes" required defaultValue={month} className={field} /></label><button className="admin-button min-h-11 px-4 text-sm font-bold">Ver mes</button></form>
    {unavailable ? <p role="alert" className="text-sm text-amber-200">No se pudo cargar la meta. Comprueba la conexión y la migración.</p> : <form onSubmit={submitForm} className="grid gap-4">
      <input type="hidden" name="month" value={month} /><input type="hidden" name="revision" value={goal?.revision ?? 0} />
      <label className="text-xs font-semibold">Meta real de {month} en MXN<input name="target" type="text" inputMode="decimal" maxLength={9} required className={field} defaultValue={goal ? (goal.target_cents / 100).toFixed(2) : ""} placeholder="Importe de tus gastos" /></label>
      <label className="text-xs font-semibold">Qué gastos se cubrirán<textarea name="description" required minLength={12} maxLength={300} className={field} defaultValue={goal?.description ?? ""} placeholder="Explica en qué se utilizarán los apoyos" /></label>
      <label className="flex items-start gap-2 text-sm leading-6"><input name="enabled" type="checkbox" className="mt-1 shrink-0" defaultChecked={goal?.enabled ?? false} /> Mostrar esta meta públicamente durante el mes elegido.</label>
      <button className={submit} disabled={pending}>{pending ? "Guardando…" : "Guardar meta"}</button><FormState state={state} />
    </form>}
  </details>;
}
