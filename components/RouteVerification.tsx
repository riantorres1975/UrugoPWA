"use client";

import { AlertTriangle, BusFront, Check, CheckCircle2, CircleDashed, LoaderCircle, Route } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { RouteConfirmationType } from "@/lib/community-report";
import type { PublicRouteSignalStatus } from "@/lib/community-route-status";

type Props = {
  routeKey: string;
  routeName: string;
};

type State = "idle" | "submitting" | "success" | "error";

const choices: ReadonlyArray<{
  type: RouteConfirmationType;
  label: string;
  icon: typeof Check;
}> = [
  { type: "seen_today", label: "La vi circular", icon: Check },
  { type: "changed", label: "Cambió", icon: Route },
  { type: "not_running", label: "Ya no circula", icon: AlertTriangle },
];

export default function RouteVerification({ routeKey, routeName }: Props) {
  const [state, setState] = useState<State>("idle");
  const [selected, setSelected] = useState<RouteConfirmationType | null>(null);
  const [message, setMessage] = useState("");
  const [publicStatus, setPublicStatus] = useState<PublicRouteSignalStatus | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`/api/v1/routes/${encodeURIComponent(routeKey)}/community-status`)
      .then(async (response) => response.ok ? response.json() as Promise<PublicRouteSignalStatus> : null)
      .then((result) => {
        if (active && result && ["recently_seen", "review_suggested", "collecting_evidence", "no_recent_data"].includes(result.state)) {
          setPublicStatus(result);
        }
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [routeKey]);

  async function confirm(type: RouteConfirmationType) {
    if (state === "submitting" || state === "success") return;
    setSelected(type);
    setState("submitting");
    setMessage("");

    try {
      const response = await fetch("/api/community/confirmations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          routeKey,
          routeName,
          confirmationType: type,
          sourcePath: window.location.pathname,
          website: "",
        }),
      });
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(body?.error || "No pudimos registrar la confirmación.");
      setState("success");
      setMessage(type === "seen_today" ? "Gracias. Tu confirmación quedó registrada." : "Gracias. Lo revisaremos antes de cambiar el mapa.");
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "No pudimos registrar la confirmación.");
    }
  }

  return (
    <section className="mt-10 border-y border-[#6aab48]/15 bg-[#0c110a] py-6" aria-labelledby="route-verification-title">
      {publicStatus && publicStatus.state !== "no_recent_data" && (
        <div className={`mb-6 flex gap-3 border-l-2 px-4 py-3 ${publicStatus.state === "recently_seen" ? "border-[#b8e840] bg-[#b8e840]/[0.06]" : "border-[#f4c84a] bg-[#f4c84a]/[0.06]"}`} role="status">
          {publicStatus.state === "recently_seen" ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--public-accent)]" aria-hidden="true" /> : publicStatus.state === "collecting_evidence" ? <CircleDashed className="mt-0.5 h-4 w-4 shrink-0 text-[#f4c84a]" aria-hidden="true" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#f4c84a]" aria-hidden="true" />}
          <div>
            <p className={`text-xs font-bold uppercase ${publicStatus.state === "recently_seen" ? "text-[var(--public-accent)]" : "text-[#f4df98]"}`}>{publicStatus.state === "recently_seen" ? "Actividad confirmada" : publicStatus.state === "collecting_evidence" ? "Verificación en curso" : "Información en revisión"}</p>
            <p className="mt-1 text-sm leading-6 text-[var(--public-secondary)]">
              {publicStatus.state === "recently_seen"
                ? `${publicStatus.supportCount} confirmaciones independientes y revisadas indican que esta ruta circuló recientemente.`
                : publicStatus.state === "review_suggested"
                  ? `${publicStatus.supportCount} confirmaciones independientes y revisadas indican cambios o posible suspensión. Confirma antes de viajar.`
                  : `${publicStatus.supportCount} de ${publicStatus.requiredCount} aportes independientes necesarios para confirmar ${publicStatus.evidenceType === "concern" ? "un posible cambio" : "actividad reciente"}.`}
              {publicStatus.observedAt && <span className="ml-1 text-[var(--public-muted)]">Actualizado {new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeZone: "America/Mexico_City" }).format(new Date(publicStatus.observedAt))}.</span>}
            </p>
          </div>
        </div>
      )}
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex max-w-xl gap-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center bg-[#b8e840] text-[#0c110a]">
            <BusFront className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 id="route-verification-title" className="text-[var(--public-ink)] public-section-title">¿Has visto esta ruta recientemente?</h2>
            <p className="mt-1 text-sm leading-6 text-[var(--public-muted)]">Tu respuesta genera una señal de revisión; nunca cambia el recorrido automáticamente.</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {choices.map((choice) => {
            const Icon = state === "submitting" && selected === choice.type ? LoaderCircle : choice.icon;
            return (
              <button
                key={choice.type}
                type="button"
                onClick={() => confirm(choice.type)}
                disabled={state === "submitting" || state === "success"}
                className="inline-flex h-10 items-center gap-2 border border-[#6aab48]/25 px-3 text-xs font-bold text-[#c9dbb9] transition hover:border-[#b8e840]/60 hover:bg-[#b8e840]/[0.07] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Icon className={`h-4 w-4 text-[var(--public-accent)] ${state === "submitting" && selected === choice.type ? "animate-spin" : ""}`} aria-hidden="true" />
                {choice.label}
              </button>
            );
          })}
        </div>
      </div>

      {message && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-l-2 border-[#b8e840] bg-[#b8e840]/[0.06] px-4 py-3" role="status">
          <p className={`text-sm font-semibold ${state === "error" ? "text-[#f4df98]" : "text-[#c9dbb9]"}`}>{message}</p>
          {state === "success" && selected !== "seen_today" && (
            <Link href={`/reportar-error?ruta=${encodeURIComponent(routeName)}&clave=${encodeURIComponent(routeKey)}&from=ruta/${routeKey}`} className="text-xs font-bold text-[var(--public-accent)] underline underline-offset-4">
              Agregar detalles
            </Link>
          )}
        </div>
      )}
    </section>
  );
}
