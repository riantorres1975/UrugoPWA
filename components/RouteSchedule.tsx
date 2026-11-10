"use client";

import { useEffect, useState } from "react";
import { getSchedule, getScheduleStatus } from "@/lib/schedules";

type Props = {
  routeName: string;
};

export default function RouteSchedule({ routeName }: Props) {
  const [tick, setTick] = useState(0);

  // Refresh every minute so "próximo" stays accurate
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const schedule = getSchedule(routeName);
  if (!schedule) return null;

  const status = getScheduleStatus(schedule, undefined, "America/Mexico_City");
  void tick; // consumed only to trigger re-render

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 ov-border border-t text-[12px]">
      {status.kind === "continuous" && (
        <>
          <Pill color="emerald">Servicio continuo</Pill>
          <span className="ov-text-muted">{status.first} – {status.last}</span>
        </>
      )}

      {status.kind === "operating" && (
        <>
          <Pill color="emerald">En servicio</Pill>
          <span className="ov-text font-semibold">
            próximo ~{status.nextMin} min
          </span>
          <span className="ov-text-muted">{status.freqLabel} · hasta {status.last}</span>
        </>
      )}

      {status.kind === "last-service" && (
        <>
          <Pill color="amber">Último servicio</Pill>
          <span className="ov-text-muted">
            quedan ~{status.minutesLeft} min · cierra {status.last}
          </span>
        </>
      )}

      {status.kind === "off" && (
        <>
          <Pill color="slate">Sin servicio</Pill>
          <span className="ov-text-muted">Inicia a las {status.first}</span>
        </>
      )}
    </div>
  );
}

function Pill({ color, children }: { color: "emerald" | "amber" | "slate"; children: string }) {
  const styles = {
    emerald: "bg-emerald-400/15 text-emerald-200",
    amber:   "bg-amber-400/15 text-amber-200",
    slate:   "ov-pill ov-text-muted",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${styles[color]}`}>
      {children}
    </span>
  );
}
