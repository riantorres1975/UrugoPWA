"use client";

import { type PointerEvent, type ReactNode, useCallback, useEffect, useId, useRef, useState } from "react";

type SnapPoint = "mini" | "full";

type BottomSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  /** Altura del estado mini en px. Default 88. Solo aplica si snapPoints está activo. */
  miniHeight?: number;
  /** Si se pasa, el sheet tiene dos snaps: mini y full. */
  snapPoints?: true;
  /** Snap actual controlado desde fuera. */
  snap?: SnapPoint;
  onSnapChange?: (snap: SnapPoint) => void;
  /** Conserva el contenido montado mientras la hoja está cerrada. */
  keepMounted?: boolean;
};

export default function BottomSheet({
  open,
  onOpenChange,
  title,
  children,
  miniHeight = 88,
  snapPoints,
  snap: snapProp,
  onSnapChange,
  keepMounted = false,
}: BottomSheetProps) {
  const [internalSnap, setInternalSnap] = useState<SnapPoint>("mini");
  const titleId = useId();
  const sheetRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const snap = snapProp ?? internalSnap;
  const setSnap = useCallback((s: SnapPoint) => {
    setInternalSnap(s);
    onSnapChange?.(s);
  }, [onSnapChange]);

  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const pointerStartY = useRef<number | null>(null);
  const snapAtDragStart = useRef<SnapPoint>("mini");

  // Cuando se abre en modo snap, empezar en mini
  useEffect(() => {
    if (!open || !snapPoints) return;
    const timer = window.setTimeout(() => setSnap("mini"), 0);
    return () => window.clearTimeout(timer);
  }, [open, setSnap, snapPoints]);

  // Bloquear scroll del body solo en full
  useEffect(() => {
    if (!open || (snapPoints && snap === "mini")) return;
    if (window.matchMedia("(min-width: 768px)").matches) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open, snap, snapPoints]);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if ((event.target as HTMLElement).closest("button")) return;
    pointerStartY.current = event.clientY;
    snapAtDragStart.current = snap;
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (pointerStartY.current === null) return;
    const diff = event.clientY - pointerStartY.current;
    if (diff > 0) setDragOffset(Math.min(diff, 320));
    if (diff < 0 && snapPoints && snapAtDragStart.current === "mini") {
      setDragOffset(Math.max(diff, -180));
    }
  };

  const onPointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (snapPoints) {
      if (snapAtDragStart.current === "mini") {
        if (dragOffset < -60) setSnap("full");
        else if (dragOffset > 60) onOpenChange(false);
      } else {
        if (dragOffset > 100) setSnap("mini");
      }
    } else {
      if (dragOffset > 120) onOpenChange(false);
    }

    setIsDragging(false);
    setDragOffset(0);
    pointerStartY.current = null;
  };

  // Altura y transform según snap
  const isMini = snapPoints && snap === "mini";
  const sheetHeight = isMini ? `${miniHeight}px` : "80dvh";

  // translateY: cuando está mini, deslizar hasta que solo sobresalga miniHeight
  // La hoja mide 80dvh en full, así que en mini debe estar desplazada (80dvh - miniHeight) hacia abajo.
  const miniTranslate = isMini ? `calc(80dvh - ${miniHeight}px)` : "0px";
  const baseTransform = open ? `translateY(calc(${miniTranslate} + ${dragOffset}px))` : "translateY(102%)";

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (snapPoints && snap === "full") setSnap("mini");
        else onOpenChange(false);
        return;
      }

      if (event.key !== "Tab" || isMini || !sheetRef.current) return;
      const focusable = Array.from(sheetRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      ));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [isMini, onOpenChange, open, setSnap, snap, snapPoints]);

  return (
    <>
      {/* Backdrop — solo en full, no en mini */}
      <div
        aria-hidden="true"
        onClick={() => (snapPoints && snap === "full" ? setSnap("mini") : onOpenChange(false))}
        className={`fixed inset-0 z-30 bg-slate-950/60 transition-opacity duration-300 lg:hidden ${
          open && (!snapPoints || snap === "full")
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
      />

      {/* ── MOBILE: Bottom Sheet ── */}
      <section
        ref={sheetRef}
        role={isMini ? "region" : "dialog"}
        aria-modal={open && !isMini ? "true" : undefined}
        aria-labelledby={titleId}
        aria-hidden={!open}
        inert={!open ? true : undefined}
        style={{ transform: baseTransform, height: "80dvh", background: "var(--ov-bg)", borderTop: "1px solid var(--ov-border)" }}
        className={`fixed inset-x-0 bottom-0 z-40 flex flex-col rounded-t-[28px] shadow-soft will-change-transform lg:hidden ${
          isDragging ? "transition-none" : "transition-[transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
        }`}
      >
        {/* Header con drag handle */}
        <header
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
          style={{ borderBottomColor: "var(--ov-border)" }}
          className="relative shrink-0 cursor-grab touch-none select-none border-b px-5 pb-4 pt-3.5 active:cursor-grabbing"
        >
          <div className="mx-auto mb-3 h-1 w-10 rounded-full" style={{ background: "var(--ov-border2, rgba(60,100,40,0.25))" }} />

          {snapPoints ? (
            /* En modo snap: la cabecera es solo el handle + contenido mini */
            <button
              type="button"
              className="flex items-center gap-3"
              onClick={() => !isDragging && setSnap(snap === "mini" ? "full" : "mini")}
              aria-expanded={snap === "full"}
            >
              <span id={titleId} className="flex-1 text-left font-display text-[15px] font-bold ov-text" style={{ color: "var(--ov-text)" }}>{title}</span>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className={`h-4 w-4 shrink-0 transition-transform duration-300 ${snap === "full" ? "rotate-180" : ""}`}
                style={{ color: "var(--ov-text-muted)" }}
                aria-hidden="true"
              >
                <path d="M18 15l-6-6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ) : (
            <>
              <p id={titleId} className="pr-12 font-display text-lg font-bold" style={{ color: "var(--ov-text)" }}>{title}</p>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="absolute right-4 top-2.5 rounded-full p-2.5 transition active:scale-[0.97]"
                style={{ background: "var(--ov-pill-bg)", color: "var(--ov-text)" }}
                aria-label="Cerrar panel"
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </>
          )}
        </header>

        <div
          aria-hidden={isMini || !open}
          inert={isMini || !open ? true : undefined}
          className={`min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-5 transition-opacity duration-200 ${
            snapPoints && snap === "mini" ? "pointer-events-none opacity-0" : "opacity-100"
          }`}
          style={{
            paddingBottom: "calc(2rem + env(safe-area-inset-bottom, 0px))",
          }}
        >
          {open || keepMounted ? children : null}
        </div>
      </section>

      {/* ── DESKTOP: backdrop fallback ── */}
      <div
        aria-hidden={!open}
        className={`pointer-events-none fixed inset-0 z-30 hidden transition-opacity duration-300 lg:block ${
          open ? "pointer-events-auto opacity-100" : "opacity-0"
        }`}
        onClick={() => onOpenChange(false)}
      />
    </>
  );
}
