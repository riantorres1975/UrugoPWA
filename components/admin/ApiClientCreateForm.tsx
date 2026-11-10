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
    <div className="border border-white/10 bg-[#10160d] p-5 sm:p-6">
      <div className="flex items-start gap-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center bg-[var(--brand-lime)] text-[#0c110a]">
          <KeyRound className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="font-serif text-2xl font-black">Nueva integración</h2>
          <p className="mt-1 text-xs leading-5 text-[var(--admin-muted)]">Crea una credencial independiente para cada proyecto.</p>
        </div>
      </div>

      <form action={action} className="mt-6 grid gap-4 sm:grid-cols-[minmax(0,1fr)_150px_auto] sm:items-end">
        <label>
          <span className="text-[10px] font-black uppercase text-[var(--admin-muted)]">Nombre</span>
          <input name="name" required minLength={2} maxLength={120} placeholder="Ej. Observatorio universitario" className="mt-2 h-11 w-full border border-white/10 bg-[var(--brand-header)] px-3 text-sm text-[#dceaca] outline-none placeholder:text-white/25 focus:border-[#6aab48]/70" />
        </label>
        <label>
          <span className="text-[10px] font-black uppercase text-[var(--admin-muted)]">Cuota por hora</span>
          <input name="hourlyLimit" type="number" required min={1} max={1000} defaultValue={30} className="mt-2 h-11 w-full border border-white/10 bg-[var(--brand-header)] px-3 text-sm tabular-nums text-[#dceaca] outline-none focus:border-[#6aab48]/70" />
        </label>
        <button disabled={pending} className="h-11 bg-[#6aab48] px-5 text-xs font-black text-[#0c110a] transition hover:bg-[#7abd53] disabled:cursor-wait disabled:opacity-60">
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
