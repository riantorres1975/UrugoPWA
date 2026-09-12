"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Layers, CircleHelp } from "lucide-react";
import ChatBotLauncher from "@/components/ChatBotLauncher";

type RoutesMapMode = "all-visible" | "all-highlighted";

function GuideButton({ variant }: { variant: "desktop" | "mobile" }) {
  return (
    <Link
      href="/guia"
      className={variant === "mobile"
        ? "ov-panel pointer-events-auto inline-flex min-h-11 items-center justify-center gap-1 px-2 rounded-xl border text-sm font-black shadow-[0_4px_16px_rgba(0,0,0,0.18)] backdrop-blur-xl transition hover:border-lima/40 hover:text-lima active:scale-[0.97]"
        : "inline-flex min-h-11 items-center justify-center gap-1.5 px-2.5 rounded-lg border border-foreground/12 bg-foreground/5 text-sm font-black text-foreground/50 transition hover:border-foreground/25 hover:text-foreground/80 active:scale-95"}
      aria-label="Abrir guía de uso"
      title="Guía de uso"
    >
      <CircleHelp className="h-4 w-4 shrink-0" aria-hidden="true" /><span className="text-[11px] font-semibold">Guía</span>
    </Link>
  );
}

function ModeButton({
  mode,
  onToggle,
  variant,
}: {
  mode: RoutesMapMode;
  onToggle: () => void;
  variant: "desktop" | "mobile";
}) {
  const isHighlighted = mode === "all-highlighted";
  return (
    <button
      type="button"
      onClick={onToggle}
      className={variant === "mobile"
        ? `ov-panel pointer-events-auto inline-flex min-h-11 items-center justify-center gap-1 px-2 rounded-xl border text-sm shadow-[0_4px_16px_rgba(0,0,0,0.18)] backdrop-blur-xl transition active:scale-[0.97] ${isHighlighted ? "border-lima/50 !bg-lima/15 text-lima" : ""}`
        : `inline-flex min-h-11 items-center justify-center gap-1.5 px-2.5 rounded-lg border text-sm transition hover:scale-105 active:scale-95 ${isHighlighted ? "border-lima/40 bg-lima/12 text-lima" : "border-foreground/12 bg-foreground/5 text-foreground/50 hover:border-foreground/25 hover:text-foreground/80"}`}
      aria-label={isHighlighted ? "Cambiar a modo todas visibles" : "Cambiar a modo todas destacadas"}
      aria-pressed={isHighlighted}
      title={isHighlighted ? "Modo: todas destacadas" : "Modo: todas visibles"}
    >
      <Layers className="h-4 w-4 shrink-0" aria-hidden="true" /><span className="text-[11px] font-semibold">{isHighlighted ? "Normal" : "Resaltar"}</span>
    </button>
  );
}

export function DesktopMapSidebar({
  controls,
  flowStep,
  hint,
  nearbyNotice,
  onToggleMode,
  routeCount,
  routeList,
  routesMapMode,
  width,
}: {
  controls: ReactNode;
  flowStep: number;
  hint: ReactNode;
  nearbyNotice: ReactNode;
  onToggleMode: () => void;
  routeCount: number;
  routeList: ReactNode;
  routesMapMode: RoutesMapMode;
  width: number | null;
}) {
  return (
    <aside
      className={`relative z-30 hidden h-full shrink-0 flex-col border-r border-foreground/8 bg-ink-900/98 backdrop-blur-2xl lg:flex ${width == null ? "lg:w-[420px]" : ""}`}
      style={width != null ? { width: `${width}px` } : undefined}
    >
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-foreground/8 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lima opacity-50" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-lima" />
          </span>
          <p className="font-serif-display text-[16px] font-black tracking-tight text-white">UruGo</p>
          <span className="rounded-full border border-lima/25 bg-lima/10 px-2 py-0.5 text-[11px] font-semibold text-lima">
            {routeCount} rutas
          </span>
        </div>
        <div className="relative flex items-center gap-2">
          <GuideButton variant="desktop" />
          <ModeButton mode={routesMapMode} onToggle={onToggleMode} variant="desktop" />
          <ChatBotLauncher />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
      <div className="shrink-0 border-b border-foreground/5 px-5 py-3">
        <div className="mb-2.5 flex items-center gap-2" role="group" aria-label="Progreso del viaje">
          {[
            { n: 1, label: "Origen" },
            { n: 2, label: "Destino" },
            { n: 3, label: "Resultado" },
          ].map(({ n, label }) => {
            const isActive = n === flowStep;
            const isDone = n < flowStep;
            return (
              <div key={n} className="flex flex-1 flex-col items-center gap-1">
                <div className={`h-1 w-full rounded-full transition-all duration-300 ${isActive ? "bg-lima" : isDone ? "bg-lima/40" : "bg-foreground/12"}`} />
                <span className={`text-[10px] font-semibold transition-colors duration-300 ${isActive ? "text-lima" : isDone ? "text-lima/60" : "text-foreground/25"}`}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>
        {hint}
      </div>

      <div className="shrink-0 space-y-2.5 border-b border-foreground/5 px-5 py-4">{controls}</div>
      {nearbyNotice}
      <div className="px-5 py-4">{routeList}</div>
      </div>
      <div className="shrink-0 border-t border-foreground/5 px-5 py-3">
        <p className="text-[11px] text-foreground/45">UruGo · Transporte de Uruapan, Mich.</p>
      </div>
    </aside>
  );
}

export function MobileMapControls({
  children,
  flowStep,
  nearbyNotice,
  onToggleMode,
  routeCount,
  routesMapMode,
}: {
  children: ReactNode;
  flowStep: number;
  nearbyNotice: ReactNode;
  onToggleMode: () => void;
  routeCount: number;
  routesMapMode: RoutesMapMode;
}) {
  return (
    <section className="pointer-events-none absolute inset-x-0 top-0 z-30 px-4 pt-safe-or-4 lg:hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 bg-gradient-to-b from-black/45 via-black/20 to-transparent" aria-hidden="true" />
      <div className="flex items-center gap-1 pr-10">
        <div className="ov-panel pointer-events-auto inline-flex items-center gap-1.5 rounded-2xl border px-2 py-2 shadow-[0_4px_24px_rgba(0,0,0,0.18)] backdrop-blur-xl">
          <span className="h-2 w-2 rounded-full bg-lima" aria-hidden="true" />
          <p className="ov-text font-serif-display text-[15px] font-black leading-none tracking-tight">UruGo</p>
          <span className="sr-only">{routeCount} rutas disponibles</span>
        </div>
        <GuideButton variant="mobile" />
        <ModeButton mode={routesMapMode} onToggle={onToggleMode} variant="mobile" />
      </div>
      <p className="ov-text mt-2 w-fit rounded-lg bg-ink-900/90 px-2.5 py-1 text-[11px]" role="status">Paso {flowStep} de 3 · {flowStep === 1 ? "Elige tu origen" : flowStep === 2 ? "Elige tu destino" : "Revisa tu viaje"}</p>
      {nearbyNotice}
      {children}
    </section>
  );
}
