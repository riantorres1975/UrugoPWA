"use client";

import { useEffect, useRef, useState } from "react";
import { loadCloudDraft, saveCloudDraft } from "@/app/admin/workspace-actions";
import { parseEditorDraft, type EditorDraft } from "@/lib/admin-route-draft";
import Link from "next/link";

const fingerprint = (v: Omit<EditorDraft, "savedAt">) => JSON.stringify([v.routeId, v.baseVersion, v.reportId, v.path,
  v.name, v.direction, v.color, v.width, v.operationalStatus, v.summary,
  v.segment ? [v.segment.start, v.segment.end, v.segment.points] : null]);

export default function CloudRouteDraft({ snapshot, dirty, disabled, onRestore }: {
  snapshot: Omit<EditorDraft, "savedAt">; dirty: boolean; disabled: boolean; onRestore: (draft: EditorDraft) => void;
}) {
  const [remote, setRemote] = useState<EditorDraft | null>(null);
  const [notice, setNotice] = useState("Consultando el borrador de tu cuenta…");
  const [others, setOthers] = useState(0);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [reload, setReload] = useState(0);
  const revision = useRef(0);
  const lastSaved = useRef("");
  const saving = useRef(false);
  const session = useRef("");
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    let cancelled = false;
    if (!session.current) session.current = crypto.randomUUID();
    let initial = true;
    async function refresh() {
      try {
        const result = await loadCloudDraft(snapshot.routeId, session.current);
        if (!mounted.current || cancelled) return;
        if (result.error) { if (initial) setNotice(result.error); return; }
        setOthers(result.otherEditors ?? 0);
        if (initial) {
          revision.current = result.draft?.revision ?? 0;
          const saved = result.draft ? parseEditorDraft(JSON.stringify(result.draft.snapshot), snapshot.routeId, result.draft.snapshot.reportId, result.serverNow) : null;
          setRemote(saved);
          setNotice(saved ? "Tienes un borrador guardado en tu cuenta." : "Guarda en tu cuenta para continuar desde otro dispositivo.");
          initial = false;
          setReady(true);
        }
      } catch { if (mounted.current && initial) setNotice("No pudimos conectar con tu cuenta. El borrador local sigue disponible."); }
    }
    void refresh(); const timer = window.setInterval(() => { if (document.visibilityState === "visible") void refresh(); }, 30_000);
    return () => { cancelled = true; mounted.current = false; window.clearInterval(timer); };
  }, [snapshot.routeId, reload]);

  async function save() {
    if (saving.current || disabled) return;
    saving.current = true; setBusy(true);
    try {
      const result = await saveCloudDraft({ ...snapshot, savedAt: Date.now() }, revision.current);
      if (!mounted.current) return;
      if (result.error) { setNotice(result.error); setEnabled(false); }
      else { revision.current = result.revision!; lastSaved.current = fingerprint(snapshot); setRemote(null); setEnabled(true); setNotice("Borrador guardado en tu cuenta. Aún no está publicado."); }
    } catch { if (mounted.current) { setNotice("No se pudo sincronizar. Conservamos la copia local; vuelve a guardar cuando tengas conexión."); setEnabled(false); } }
    finally { saving.current = false; if (mounted.current) setBusy(false); }
  }
  const saveRef = useRef(save);
  useEffect(() => { saveRef.current = save; });
  useEffect(() => {
    if (!enabled || busy || disabled || lastSaved.current === fingerprint(snapshot)) return;
    const timer = window.setTimeout(() => void saveRef.current(), 1400);
    return () => window.clearTimeout(timer);
  }, [snapshot, disabled, enabled, busy]);

  return <section className="admin-card space-y-2 p-4 xl:col-span-2" aria-label="Borrador en la cuenta">
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-bold">Borrador en tu cuenta</h3>
      <div className="flex flex-wrap gap-2"><button type="button" disabled={busy || disabled || !!remote || !ready} onClick={() => void save()} className="admin-button min-h-11 px-3 text-xs font-bold">{busy ? "Guardando…" : "Guardar en mi cuenta"}</button>
        <button type="button" disabled={busy || disabled} className="admin-button min-h-11 px-3 text-xs font-bold" onClick={() => { setEnabled(false); setReady(false); setReload((n) => n + 1); }}>Consultar copia de mi cuenta</button></div></div>
    <p className="text-xs text-[var(--admin-muted)]" role="status">{notice}</p>
    {others > 0 && <p className="text-xs text-amber-200" role="status">Hay {others} otra(s) sesión(es) editando este sentido. Cada administrador conserva su propio borrador; al publicar se comprueba la versión.</p>}
    {remote && <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs">Versión base {remote.baseVersion} · {new Date(remote.savedAt).toLocaleString("es-MX")}</span>
      <button type="button" className="admin-button min-h-11 px-3 text-xs font-bold" disabled={disabled || remote.baseVersion !== snapshot.baseVersion || remote.reportId !== snapshot.reportId}
        onClick={() => { if (!dirty || window.confirm("¿Sustituir el borrador que estás editando por el de tu cuenta?")) {
          lastSaved.current = fingerprint(remote); onRestore(remote); setRemote(null); setEnabled(true);
        } }}>Continuar borrador de mi cuenta</button>
      <button type="button" className="admin-button min-h-11 px-3 text-xs font-bold" disabled={disabled} onClick={() => {
        if (window.confirm("¿Reemplazar la copia de tu cuenta por este borrador?")) { setRemote(null); void save(); }
      }}>Reemplazar copia de mi cuenta</button>
      {remote.baseVersion !== snapshot.baseVersion && <p className="text-xs text-amber-200">La ruta publicada cambió. Conserva tu copia local y revisa la nueva versión antes de guardar.</p>}
      {remote.reportId !== snapshot.reportId && <Link className="text-xs underline" href={`/admin/routes/${snapshot.routeId}${remote.reportId ? `?reporte=${remote.reportId}` : ""}`}>Abrir el contexto del borrador guardado</Link>}
    </div>}
  </section>;
}
