"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function SupportInboxNotice({ initialCount }: { initialCount: number | null }) {
  const [count, setCount] = useState(initialCount);
  const [changed, setChanged] = useState(false);
  const [pending, startTransition] = useTransition();
  const latest = useRef<string | null>(null);
  const router = useRouter();
  useEffect(() => {
    let active = true;
    let busy = false;
    const controller = new AbortController();
    async function check() {
      if (document.visibilityState !== "visible" || busy) return;
      busy = true;
      try {
        const response = await fetch("/api/admin/support/inbox", { cache: "no-store", signal: AbortSignal.any([controller.signal, AbortSignal.timeout(7000)]) });
        const body = await response.json().catch(() => null);
        if (!active || !response.ok || !Number.isSafeInteger(body?.count)) return;
        if ((latest.current && body.latest && body.latest !== latest.current) || (initialCount !== null && body.count > initialCount)) setChanged(true);
        latest.current = body.latest; setCount(body.count);
      } catch { /* Don't interrupt an administrator editing a form. */ }
      finally { busy = false; }
    }
    void check();
    const timer = setInterval(() => void check(), 60000);
    document.addEventListener("visibilitychange", check);
    return () => { active = false; clearInterval(timer); controller.abort(); document.removeEventListener("visibilitychange", check); };
  }, [initialCount]);
  return <div className="support-inbox-notice admin-card my-5 flex flex-wrap items-center justify-between gap-3 p-4"><p className="text-sm" role="status">{changed ? "La bandeja tiene avisos nuevos o actualizados. " : ""}{count === null ? "Bandeja de apoyos" : `${count} ${count === 1 ? "apoyo pendiente" : "apoyos pendientes"} de revisar`}</p>
    <button type="button" className={`admin-button min-h-11 px-3 text-xs font-bold ${changed ? "admin-primary" : ""}`} disabled={pending} onClick={() => { setChanged(false); startTransition(() => router.refresh()); }}>{pending ? "Actualizando…" : "Actualizar bandeja"}</button>
    <small className="w-full text-xs text-[var(--admin-muted)]">El aviso se comprueba cada minuto. La bandeja se actualiza cuando lo pides para conservar los cambios que estés editando.</small>
  </div>;
}
