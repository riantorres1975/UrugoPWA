"use client";

import dynamic from "next/dynamic";
import { useId, useRef, useState } from "react";
import { Check, Flag, ThumbsDown, ThumbsUp } from "lucide-react";
import { FEEDBACK_REASONS, type FeedbackReason } from "@/lib/journey-feedback";
import { readFeedback, saveFeedback } from "@/lib/journey-feedback-client";

const JourneyReportForm = dynamic(() => import("@/components/JourneyReportForm"), {
  loading: () => <p role="status" className="ov-text-muted py-3 text-sm">Abriendo reporte…</p>,
});

export default function JourneyFeedback({ routes }: { routes: string[] }) {
  const [reportOpen, setReportOpen] = useState(false);
  const [reportLoaded, setReportLoaded] = useState(false);
  const [vote, setVote] = useState(() => readFeedback(routes));
  const [pending, setPending] = useState(false);
  const [reason, setReason] = useState<FeedbackReason | "">(vote?.reason ?? "");
  const [skipReason, setSkipReason] = useState(false);
  const [error, setError] = useState("");
  const saving = useRef(false);
  const reportId = useId();

  async function submit(useful: boolean, selectedReason: FeedbackReason | null = null) {
    if (saving.current) return;
    saving.current = true;
    setPending(true);
    setError("");
    try {
      await saveFeedback(routes, { useful, reason: selectedReason });
      setVote({ useful, reason: selectedReason });
    } catch (cause) {
      setError(cause instanceof TypeError ? "Sin conexión. Vuelve a intentar cuando tengas internet." : cause instanceof Error ? cause.message : "No pudimos guardar tu opinión.");
    } finally { saving.current = false; setPending(false); }
  }

  return (
    <section className="ov-border border-t px-4 py-4" aria-label="Opinión y reporte del viaje">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {vote ? (
          <p role="status" className="ov-text flex items-center gap-2 text-[13px]">
            <Check className="h-4 w-4 shrink-0 text-lima" aria-hidden="true" /> Gracias por tu opinión.
          </p>
        ) : (
          <>
            <p className="ov-text text-[13px] font-medium">{routes.length > 1 ? "¿Te sirvió este transbordo?" : "¿Te sirvió esta ruta?"}</p>
            <div className="flex gap-2">
              {(["si", "no"] as const).map((value) => {
                const Icon = value === "si" ? ThumbsUp : ThumbsDown;
                return <button key={value} type="button" disabled={pending} onClick={() => void submit(value === "si")} className="ov-pill ov-border ov-text inline-flex min-h-11 items-center gap-1.5 rounded-xl border px-3 text-[13px] font-semibold transition hover:border-lima/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-lima disabled:opacity-50">
                  <Icon className="h-4 w-4" aria-hidden="true" />{value === "si" ? "Sí" : "No"}
                </button>;
              })}
            </div>
          </>
        )}
      </div>
      {vote?.useful === false && !vote.reason && !skipReason && <form className="ov-pill mt-3 space-y-3 rounded-xl p-3" onSubmit={(event) => { event.preventDefault(); if (reason) void submit(false, reason); }}>
        <fieldset disabled={pending}>
          <legend className="ov-text text-sm font-semibold">¿Qué salió mal? <span className="ov-text-muted font-normal">(opcional)</span></legend>
          <p className="ov-text-muted mt-1 text-xs">Tu opinión ya se guardó. El motivo nos ayuda a revisarla.</p>
          <div className="mt-2 grid gap-1">
            {(Object.entries(FEEDBACK_REASONS) as [FeedbackReason, string][]).filter(([key]) => routes.length > 1 || key !== "transfer_far").map(([key, label]) => <label key={key} className="ov-text flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 text-[13px] hover:bg-lima/5">
              <input type="radio" name={`${reportId}-reason`} value={key} checked={reason === key} onChange={() => setReason(key)} className="h-4 w-4 accent-lima" />{label}
            </label>)}
          </div>
        </fieldset>
        <div className="flex gap-2">
          <button disabled={pending || !reason} className="min-h-11 flex-1 rounded-xl bg-lima px-3 text-[13px] font-semibold text-pino disabled:opacity-50">Guardar motivo</button>
          <button type="button" disabled={pending} onClick={() => setSkipReason(true)} className="ov-text-muted min-h-11 px-3 text-[13px]">Ahora no</button>
        </div>
      </form>}
      {vote?.reason && <p role="status" className="ov-text-muted mt-2 text-[13px]">Motivo guardado: {FEEDBACK_REASONS[vote.reason]}</p>}
      {pending && <p role="status" className="ov-text-muted mt-2 text-[13px]">Guardando…</p>}
      {error && <p role="alert" className="mt-2 text-[13px] text-amber-200">{error}</p>}
      <button type="button" aria-expanded={reportOpen} aria-controls={reportId} onClick={() => { setReportLoaded(true); setReportOpen(!reportOpen); }} className="ov-text-muted mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl text-[13px] font-medium transition hover:bg-lima/5 hover:text-lima focus-visible:outline focus-visible:outline-2 focus-visible:outline-lima">
        <Flag className="h-4 w-4" aria-hidden="true" />{reportOpen ? "Ocultar reporte" : "Reportar un problema"}
      </button>
      <div id={reportId} hidden={!reportOpen}>
        {reportLoaded && <JourneyReportForm routes={routes} quickFeedback={vote?.useful === false} />}
      </div>
    </section>
  );
}
