"use client";

import { startTransition, useActionState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { rotateSupportAccess } from "@/app/admin/support-actions";
import SupportAccessTicket from "@/components/SupportAccessTicket";

export default function SupportAccessForm({ id, revision }: { id: string; revision: number }) {
  const [state, action, pending] = useActionState(rotateSupportAccess, {});
  const router = useRouter();
  function submitForm(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); startTransition(() => action(form)); }
  return <details className="mt-4 border-t border-[var(--admin-line)] pt-4"><summary className="cursor-pointer text-sm font-semibold">Acceso privado de la persona que apoyó</summary>
    <p className="my-3 text-xs leading-6 text-[var(--admin-muted)]">Para recuperar el acceso o para avisos anteriores a esta función. Crear un código nuevo invalida el anterior. Entrégalo solo después de comprobar quién realizó el pago.</p>
    {state.accessCode ? <><SupportAccessTicket code={state.accessCode} /><button className="admin-button mt-3 min-h-11 px-3 text-xs font-bold" type="button" onClick={() => router.refresh()}>Ya guardé el código · Actualizar bandeja</button></> : <form onSubmit={submitForm} className="grid gap-3">
      <input type="hidden" name="id" value={id} /><input type="hidden" name="revision" value={revision} />
      <label className="flex items-start gap-2 text-xs leading-6"><input type="checkbox" name="acknowledged" required className="mt-1 shrink-0" /> Entregaré el código únicamente a la persona que realizó el apoyo; el código anterior dejará de funcionar.</label>
      <button className="admin-button min-h-11 px-3 text-xs font-bold" disabled={pending}>{pending ? "Creando acceso…" : "Crear código privado nuevo"}</button>
    </form>}
    {state.error && <p role="alert" className="mt-2 text-xs text-amber-200">{state.error}</p>}
  </details>;
}
