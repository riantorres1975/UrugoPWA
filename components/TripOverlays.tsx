"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

export default function TripOverlays({
  alert,
  onCancelStop,
  onConfirmStop,
  onConfirmArrival,
  onDismissAlert,
  stopDialogOpen,
}: {
  alert: string | null;
  onCancelStop: () => void;
  onConfirmStop: () => void;
  onConfirmArrival: () => void;
  onDismissAlert: () => void;
  stopDialogOpen: boolean;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!stopDialogOpen) return;

    const previousFocus = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const focusFrame = window.requestAnimationFrame(() => confirmButtonRef.current?.focus());
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCancelStop();
        return;
      }
      if (event.key !== "Tab") return;

      const buttons = Array.from(
        dialogRef.current?.querySelectorAll<HTMLButtonElement>("button:not([disabled])") ?? [],
      );
      const firstButton = buttons[0];
      const lastButton = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === firstButton) {
        event.preventDefault();
        lastButton?.focus();
      } else if (!event.shiftKey && document.activeElement === lastButton) {
        event.preventDefault();
        firstButton?.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleKeyDown);
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [onCancelStop, stopDialogOpen]);

  return (
    <>
      {stopDialogOpen ? createPortal(
        <div
          className="pointer-events-auto fixed inset-0 z-[90] flex items-end justify-center bg-black/65 px-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] pt-4 sm:items-center sm:pb-4"
          onClick={onCancelStop}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="stop-trip-title"
            aria-describedby="stop-trip-description"
            className="ov-panel ov-border w-full max-w-sm rounded-lg border p-4 shadow-[0_18px_60px_rgba(0,0,0,0.55)]"
            onClick={(event) => event.stopPropagation()}
          >
            <p id="stop-trip-title" className="ov-text text-base font-bold">
              ¿Finalizar el viaje?
            </p>
            <p id="stop-trip-description" className="ov-text-muted mt-1 text-sm leading-5">
              El seguimiento y los avisos de bajada se detendrán.
            </p>
            <button type="button" onClick={onConfirmArrival}
              className="mt-4 min-h-11 w-full rounded-lg bg-lima px-4 text-sm font-bold text-ink-900">
              Llegué a mi destino
            </button>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onCancelStop}
                className="ov-pill ov-border ov-text h-11 rounded-lg border px-4 text-sm font-semibold transition active:scale-[0.98]"
              >
                Cancelar
              </button>
              <button
                ref={confirmButtonRef}
                type="button"
                onClick={onConfirmStop}
                className="h-11 rounded-lg border border-red-400/45 bg-red-500/15 px-4 text-sm font-bold text-red-300 transition hover:bg-red-500/25 active:scale-[0.98]"
              >
                Solo finalizar
              </button>
            </div>
          </div>
        </div>, document.body
      ) : null}

      {alert ? (
        <div
          role="alert"
          className="pointer-events-auto max-h-[25dvh] overflow-y-auto rounded-2xl"
        >
          <div className="pointer-events-auto flex w-full min-w-0 max-w-md items-start gap-2.5 rounded-2xl border border-lima/40 bg-slate-900/95 px-4 py-3 shadow-[0_12px_40px_rgba(0,0,0,0.5)] backdrop-blur-xl">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-lima/15">
              <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 text-lima" aria-hidden="true">
                <path d="M12 8v4m0 4h.01" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                <path d="M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0Z" stroke="currentColor" strokeWidth="1.8" />
              </svg>
            </span>
            <p className="min-w-0 flex-1 text-[13px] font-medium leading-5 text-slate-50">{alert}</p>
            <button
              type="button"
              onClick={onDismissAlert}
              aria-label="Cerrar aviso"
              className="shrink-0 rounded-full p-1 text-slate-400 transition hover:text-slate-200 active:scale-[0.95]"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
