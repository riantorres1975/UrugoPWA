"use client";

import dynamic from "next/dynamic";
import { useId, useState } from "react";
import { Check, Flag, ThumbsDown, ThumbsUp } from "lucide-react";

const JourneyReportForm = dynamic(() => import("@/components/JourneyReportForm"), {
  loading: () => <p role="status" className="ov-text-muted py-3 text-sm">Abriendo reporte…</p>,
});

export default function JourneyFeedback({ routes, feedbackGiven, onFeedback }: {
  routes: string[];
  feedbackGiven: boolean;
  onFeedback: (useful: "si" | "no") => void;
}) {
  const [reportOpen, setReportOpen] = useState(false);
  const [reportLoaded, setReportLoaded] = useState(false);
  const [negative, setNegative] = useState(false);
  const reportId = useId();

  return (
    <section className="ov-border border-t px-4 py-4" aria-label="Opinión y reporte del viaje">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {feedbackGiven ? (
          <p role="status" className="ov-text flex items-center gap-2 text-[13px]">
            <Check className="h-4 w-4 shrink-0 text-lima" aria-hidden="true" /> Gracias por tu opinión.
          </p>
        ) : (
          <>
            <p className="ov-text text-[13px] font-medium">{routes.length > 1 ? "¿Te sirvió este transbordo?" : "¿Te sirvió esta ruta?"}</p>
            <div className="flex gap-2">
              {(["si", "no"] as const).map((value) => {
                const Icon = value === "si" ? ThumbsUp : ThumbsDown;
                return <button key={value} type="button" onClick={() => {
                  onFeedback(value);
                  if (value === "no") { setNegative(true); setReportLoaded(true); setReportOpen(true); }
                }} className="ov-pill ov-border ov-text inline-flex min-h-11 items-center gap-1.5 rounded-xl border px-3 text-[13px] font-semibold transition hover:border-lima/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-lima">
                  <Icon className="h-4 w-4" aria-hidden="true" />{value === "si" ? "Sí" : "No"}
                </button>;
              })}
            </div>
          </>
        )}
      </div>
      <button type="button" aria-expanded={reportOpen} aria-controls={reportId} onClick={() => { setReportLoaded(true); setReportOpen(!reportOpen); }} className="ov-text-muted mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl text-[13px] font-medium transition hover:bg-lima/5 hover:text-lima focus-visible:outline focus-visible:outline-2 focus-visible:outline-lima">
        <Flag className="h-4 w-4" aria-hidden="true" />{reportOpen ? "Ocultar reporte" : "Reportar un problema"}
      </button>
      <div id={reportId} hidden={!reportOpen}>
        {reportLoaded && <JourneyReportForm routes={routes} quickFeedback={negative} />}
      </div>
    </section>
  );
}
