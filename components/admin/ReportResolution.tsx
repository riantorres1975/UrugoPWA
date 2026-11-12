"use client";

import { useActionState } from "react";
import { resolveAdminReport } from "@/app/admin/workspace-actions";
export default function ReportResolution({ id, note, at, by }: { id: string; note?: string | null; at?: string | null; by?: string | null }) {
  const [state, action, pending] = useActionState(resolveAdminReport, { message: "", ok: false });
  if (at || state.ok) return <div className="mt-3 rounded-xl border border-emerald-300/30 bg-emerald-300/5 p-3">
    <p className="text-sm font-bold text-emerald-200">Resuelto</p>
    <p className="mt-1 whitespace-pre-wrap text-xs text-[var(--admin-muted)]">{note || state.message}</p>
    {at && <p className="mt-2 text-xs text-[var(--admin-muted)]">{new Date(at).toLocaleString("es-MX", { timeZone: "America/Mexico_City" })} · Admin {by?.slice(0, 8)}</p>}
  </div>;
  return <details className="mt-3 rounded-xl border border-[var(--admin-line)] p-3"><summary className="min-h-9 cursor-pointer py-2 text-sm font-bold">Marcar como resuelto</summary>
    <p className="mb-2 text-xs leading-5 text-[var(--admin-muted)]">Cierra el reporte después de comprobar la solución. También sirve para ajustes de horarios o problemas de uso que no cambian el trazado.</p>
    <form action={action} className="space-y-2"><input type="hidden" name="reportId" value={id} />
      <label className="block text-xs font-bold">Cómo se solucionó<textarea name="resolution" required minLength={10} maxLength={1000} rows={3} className="admin-field mt-1 w-full" /></label>
      <button className="admin-button admin-primary min-h-11 px-3 text-xs font-bold" disabled={pending}>{pending ? "Cerrando…" : "Confirmar solución"}</button>
      {state.message && <p role="alert" className="text-xs text-amber-200">{state.message}</p>}
    </form></details>;
}
