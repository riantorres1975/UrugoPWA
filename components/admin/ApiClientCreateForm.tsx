"use client";

import { Check, Copy, KeyRound } from "lucide-react";
import { useActionState, useState } from "react";
import { createCommunityApiClient } from "@/app/admin/actions";

const INITIAL_STATE = { message: "", status: "idle" as const };

export default function ApiClientCreateForm() {
  const [state, action, pending] = useActionState(
    createCommunityApiClient,
    INITIAL_STATE,
  );
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyKey = async () => {
    if (!state.apiKey) return;
    try {
      await navigator.clipboard.writeText(state.apiKey);
      setCopiedKey(state.apiKey);
    } catch {
      setCopiedKey(null);
    }
  };

  return (
    <div className="admin-card p-4 sm:p-5">
      <div className="flex items-start gap-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--admin-tint)] text-[var(--brand-lime)]">
          <KeyRound className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-lg font-bold">Nueva integración</h2>
          <p className="mt-1 text-xs leading-5 text-[var(--admin-muted)]">Crea una credencial independiente para cada proyecto.</p>
        </div>
      </div>

      <form action={action} className="mt-6 grid gap-4 sm:grid-cols-[minmax(0,1fr)_150px_auto] sm:items-end">
        <label>
          <span className="text-[10px] font-black uppercase text-[var(--admin-muted)]">Nombre</span>
          <input name="name" required minLength={2} maxLength={120} placeholder="Ej. Observatorio universitario" className="admin-field mt-1 w-full" />
        </label>
        <label>
          <span className="text-[10px] font-black uppercase text-[var(--admin-muted)]">Cuota por hora</span>
          <input name="hourlyLimit" type="number" required min={1} max={1000} defaultValue={30} className="admin-field mt-1 w-full tabular-nums" />
        </label>
        <button disabled={pending} className="admin-button admin-primary min-h-11 px-5 text-xs font-bold">
          {pending ? "Creando..." : "Crear clave"}
        </button>
      </form>

      {state.status === "error" && <p role="alert" className="mt-4 border-l-2 border-[#dd6b5f] pl-3 text-xs text-[#e98b80]">{state.message}</p>}
      {state.status === "success" && state.apiKey && (
        <div className="mt-5 border border-[#b8e840]/30 bg-[#b8e840]/[0.05] p-4">
          <p className="text-xs font-black text-[var(--brand-lime)]">{state.message}</p>
          <div className="mt-3 flex items-center gap-2">
            <code className="min-w-0 flex-1 break-all bg-[var(--brand-header)] px-3 py-3 text-xs text-[#dceaca]">{state.apiKey}</code>
            <button type="button" onClick={copyKey} aria-label="Copiar clave" title="Copiar clave" className="grid h-10 w-10 shrink-0 place-items-center border border-white/15 text-[var(--admin-muted)] transition hover:border-[#6aab48]/60 hover:text-[var(--brand-white)]">
              {copiedKey === state.apiKey ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
