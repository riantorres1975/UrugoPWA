"use client";

import type { ReactNode } from "react";
import type { TransferOption } from "@/lib/transfers";
import { formatRouteLabel } from "@/lib/route-names";

type RouteInstructions = {
  title: string;
  items: string[];
};

type ActiveRouteSummaryProps = {
  children?: ReactNode;
  instructions: RouteInstructions | null;
  routeColor: string | null;
  routeName: string | null;
  showTeleferico: boolean;
  transfer: TransferOption | null;
  showActions?: boolean;
  onClear: () => void;
  onShare: () => void;
  instructionActions?: ({ label: string; onClick: () => void } | null)[];
};

export default function ActiveRouteSummary({
  children,
  instructions,
  routeColor,
  routeName,
  showTeleferico,
  transfer,
  showActions = true,
  onClear,
  onShare,
  instructionActions,
}: ActiveRouteSummaryProps) {
  const hasActiveSelection = Boolean(routeName || showTeleferico || transfer);

  return (
    <>
      {hasActiveSelection && showActions && (
        <div className="ov-border flex items-center gap-2 border-t px-4 py-2.5">
          {transfer ? (
            <span className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-blue-400" aria-hidden="true" />
              <span className="ov-text-muted truncate text-[12px] font-medium">{formatRouteLabel(transfer.routeAName)}</span>
              <span className="shrink-0 text-[10px] font-bold text-avocado-400">→</span>
              <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-400" aria-hidden="true" />
              <span className="ov-text-muted truncate text-[12px] font-medium">{formatRouteLabel(transfer.routeBName)}</span>
            </span>
          ) : (
            <>
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: routeColor ?? "#14b8a6" }} aria-hidden="true" />
              <span className="ov-text-muted min-w-0 flex-1 truncate text-[12px] font-medium">
                {routeName ? formatRouteLabel(routeName, routeName) : "Teleférico Uruapan"}
              </span>
            </>
          )}
          <button
            type="button"
            onClick={onShare}
            className="ov-pill ov-text-muted grid h-9 w-9 shrink-0 place-items-center rounded-lg transition hover:opacity-80 active:scale-95"
            aria-label={transfer ? "Compartir transbordo" : `Compartir ${routeName ? formatRouteLabel(routeName, routeName) : "Teleférico"}`}
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
              <path d="M8.59 13.51l6.83 3.98m-.01-10.98-6.82 3.98M21 5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm0 14a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM3 12a3 3 0 1 1 6 0 3 3 0 0 1-6 0Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            type="button"
            onClick={onClear}
            className="ov-pill ov-border ov-text-muted h-9 shrink-0 rounded-lg border px-3 text-[11px] font-semibold transition active:scale-[0.97]"
          >
            Limpiar
          </button>
        </div>
      )}

      {children}

      {instructions && (
        <section className="ov-border border-t px-4 py-3" aria-label={instructions.title}>
          <h2 className="ov-text-muted text-[11px] font-bold uppercase tracking-[0.18em]">{instructions.title}</h2>
          <ol className="ov-text mt-3 space-y-3 text-[13px] leading-5">
            {instructions.items.map((item, index) => (
              <li key={item} className="flex gap-2">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-lima/10 text-[11px] font-bold text-lima" aria-hidden="true">{index + 1}</span>
                <div className="min-w-0 flex-1"><p>{item}</p>
                  {instructionActions?.[index] && <button type="button" onClick={instructionActions[index]!.onClick}
                    className="mt-1 inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-xs font-semibold text-lima underline decoration-lima/40 underline-offset-4 hover:bg-lima/10">
                    {instructionActions[index]!.label}<span aria-hidden="true">↗</span>
                  </button>}
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}
    </>
  );
}
