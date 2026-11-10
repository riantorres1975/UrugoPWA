"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Layers, CircleHelp } from "lucide-react";
import ChatBotLauncher from "@/components/ChatBotLauncher";

type RoutesMapMode = "all-visible" | "all-highlighted";

function MapBrandMark() {
  return <span className="map-brand-mark">Uru<span>Go</span></span>;
}

function GuideButton({ variant }: { variant: "desktop" | "mobile" }) {
  return (
    <Link
      href="/guia"
      className={variant === "mobile"
        ? "ov-panel pointer-events-auto inline-flex min-h-11 items-center justify-center gap-1 px-2 rounded-xl border text-sm font-black shadow-[0_4px_16px_rgba(0,0,0,0.18)] backdrop-blur-xl transition hover:border-lima/40 hover:text-lima active:scale-[0.97]"
        : "ov-pill ov-border ov-text inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border px-2.5 text-sm transition hover:text-lima active:scale-95"}
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
        : `ov-pill inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border px-2.5 text-sm transition hover:text-lima active:scale-95 ${isHighlighted ? "border-lima/40 text-lima" : "ov-border ov-text"}`}
      aria-label={isHighlighted ? "Cambiar a modo todas visibles" : "Cambiar a modo todas destacadas"}
      aria-pressed={isHighlighted}
      title={isHighlighted ? "Modo: todas destacadas" : "Modo: todas visibles"}
    >
      <Layers className="h-4 w-4 shrink-0" aria-hidden="true" /><span className="hidden text-[11px] font-semibold min-[350px]:inline">{isHighlighted ? "Normal" : "Resaltar"}</span>
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
      className={`relative z-30 hidden h-full shrink-0 flex-col border-r ov-border bg-[var(--brand-header)] lg:flex ${width == null ? "lg:w-[420px]" : ""}`}
      style={width != null ? { width: `${width}px` } : undefined}
    >
      <div className="ov-border flex shrink-0 flex-wrap items-center justify-between gap-3 border-b px-5 py-3">
        <MapBrandMark />
        <div className="relative flex items-center gap-2">
          <GuideButton variant="desktop" />
          <ModeButton mode={routesMapMode} onToggle={onToggleMode} variant="desktop" />
          <ChatBotLauncher />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
      <div className="ov-border shrink-0 border-b px-5 py-3">
        <div className="mb-1 flex items-center justify-between gap-2">
          <p className="map-eyebrow">Transporte en Uruapan</p>
          <span className="ov-text-muted text-[11px] font-semibold">{routeCount} rutas</span>
        </div>
        <p className="mb-4 text-2xl font-bold tracking-tight">Planea tu <em className="font-serif-display font-medium text-lima">viaje</em></p>
        <div className="mb-2.5 flex items-center gap-2" role="group" aria-label="Progreso del viaje">
          {[
            { n: 1, label: "Origen" },
            { n: 2, label: "Destino" },
            { n: 3, label: "Resultado" },
          ].map(({ n, label }) => {
            const isActive = n === flowStep;
            const isDone = n < flowStep;
            return (
              <div key={n} aria-current={isActive ? "step" : undefined} className="flex flex-1 flex-col items-center gap-1">
                <div className={`h-1 w-full rounded-full transition-all duration-300 ${isActive ? "bg-lima" : isDone ? "bg-lima/40" : "bg-foreground/12"}`} />
                <span className={`text-[11px] font-semibold ${isActive ? "text-lima" : "ov-text-muted"}`}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>
        {hint}
      </div>

      <div className="ov-border shrink-0 space-y-2.5 border-b px-5 py-4">{controls}</div>
      {nearbyNotice}
      <div className="px-5 py-4">{routeList}</div>
      </div>
      <div className="ov-border shrink-0 border-t px-5 py-3">
        <p className="ov-text-muted text-[11px]">UruGo · Transporte de Uruapan, Mich.</p>
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
    <section className="map-mobile-top pointer-events-none absolute inset-x-0 top-0 z-30 px-3 lg:hidden">
      <div className="map-mobile-toolbar flex items-center gap-1.5">
        <div className="ov-panel inline-flex min-h-11 items-center gap-1.5 rounded-xl border px-2.5 shadow-soft">
          <MapBrandMark />
          <span className="sr-only">{routeCount} rutas disponibles</span>
        </div>
        <GuideButton variant="mobile" />
        <ModeButton mode={routesMapMode} onToggle={onToggleMode} variant="mobile" />
      </div>
      {children && (
        <div className="map-planner pointer-events-auto mt-2">
          <p className="map-step flex items-center gap-2 text-xs font-semibold" role="status">
            <span className="map-step-track flex gap-0.5" aria-hidden="true">
              {[1, 2, 3].map((step) => <span key={step} data-reached={step <= flowStep} />)}
            </span>
            <span className="sr-only">Paso {flowStep} de 3.</span>
            {flowStep === 1 ? "Elige tu origen" : flowStep === 2 ? "Elige tu destino" : "Revisa tu viaje"}
          </p>
          {children}
        </div>
      )}
      {nearbyNotice}
    </section>
  );
}
