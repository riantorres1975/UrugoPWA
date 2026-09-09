"use client";

import {
  Ban,
  BusFront,
  CheckCircle2,
  CircleEllipsis,
  Clock3,
  LoaderCircle,
  MapPin,
  MapPinned,
  Send,
  Smartphone,
} from "lucide-react";
import { useMemo, useState, useSyncExternalStore } from "react";
import RouteProposalMap from "@/components/RouteProposalMap";
import type { CommunityReportType } from "@/lib/community-report";
import type { Coordinates } from "@/lib/types";

const subscribeBrowserContext = () => () => {};
const CUSTOM_ROUTE_VALUE = "__custom__";

type ReportChoice = {
  value: CommunityReportType;
  label: string;
  hint: string;
  icon: typeof BusFront;
};

const REPORT_CHOICES: ReadonlyArray<ReportChoice> = [
  { value: "route_changed", label: "Pasa por otras calles", hint: "El recorrido del mapa no coincide", icon: MapPinned },
  { value: "route_inactive", label: "Ya no circula", hint: "La ruta dejó de dar servicio", icon: Ban },
  { value: "route_missing", label: "Falta una ruta", hint: "Conoces una que no aparece", icon: BusFront },
  { value: "schedule_changed", label: "Horario incorrecto", hint: "Cambió la hora o frecuencia", icon: Clock3 },
  { value: "landmark_changed", label: "Parada o referencia", hint: "Un lugar está mal ubicado", icon: MapPin },
  { value: "location_problem", label: "Mi ubicación falla", hint: "El GPS muestra otro lugar", icon: Smartphone },
  { value: "other", label: "Otro problema", hint: "Algo distinto a lo anterior", icon: CircleEllipsis },
];

const ROUTE_REPORT_TYPES: ReadonlyArray<CommunityReportType> = [
  "route_incorrect",
  "route_changed",
  "route_inactive",
  "route_missing",
  "schedule_changed",
  "landmark_changed",
];

const PATH_REPORT_TYPES: ReadonlyArray<CommunityReportType> = ["route_incorrect", "route_changed"];

type RouteOption = {
  name: string;
  slug: string;
};

type ReportBugFormProps = {
  initialRoute?: string;
  initialRouteKey?: string;
  initialLandmark?: string;
  routeOptions: RouteOption[];
};

type SubmitState = "idle" | "submitting" | "success" | "error";

function getSourceUrl() {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get("from");
  const safePath = raw ? `/${raw.replace(/^\/+/, "").replace(/\.\.\//g, "")}` : null;
  const from = safePath && /^[\w/-]+$/.test(safePath) ? safePath : null;
  return from ? `${window.location.origin}${from}` : window.location.href;
}

function promptFor(reportType: CommunityReportType) {
  switch (reportType) {
    case "route_changed": return "Cuéntanos desde qué calle cambia y por dónde pasa ahora.";
    case "route_inactive": return "Cuéntanos cuándo fue la última vez que la viste circular.";
    case "route_missing": return "Escribe cómo se conoce la ruta y de dónde a dónde va.";
    case "schedule_changed": return "Indica el horario que muestra UruGo y el horario correcto.";
    case "landmark_changed": return "Dinos qué parada o referencia está mal y dónde debería estar.";
    case "location_problem": return "Cuéntanos dónde estabas y qué ubicación mostró la app.";
    default: return "Cuéntanos qué viste y cuál sería la información correcta.";
  }
}

export default function ReportBugForm({
  initialRoute = "",
  initialRouteKey,
  initialLandmark = "",
  routeOptions,
}: ReportBugFormProps) {
  const [reportType, setReportType] = useState<CommunityReportType>("route_changed");
  const [selectedRouteKey, setSelectedRouteKey] = useState(initialRouteKey ?? "");
  const [routeName, setRouteName] = useState(initialRoute);
  const [place, setPlace] = useState(initialLandmark ? `Cerca de ${initialLandmark}` : "");
  const [description, setDescription] = useState("");
  const [contact, setContact] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [proposedPath, setProposedPath] = useState<Coordinates[]>([]);
  const [website, setWebsite] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [submitError, setSubmitError] = useState("");
  const sourceUrl = useSyncExternalStore(subscribeBrowserContext, getSourceUrl, () => "");

  const selectedChoice = REPORT_CHOICES.find((choice) => choice.value === reportType) ?? REPORT_CHOICES[0];
  const requiresRoute = ROUTE_REPORT_TYPES.includes(reportType);
  const canProposePath = Boolean(
    PATH_REPORT_TYPES.includes(reportType)
    && selectedRouteKey
    && selectedRouteKey !== CUSTOM_ROUTE_VALUE,
  );
  const isCustomRoute = requiresRoute && selectedRouteKey === CUSTOM_ROUTE_VALUE;
  const canSubmit = description.trim().length >= 10
    && (!requiresRoute || routeName.trim().length > 0)
    && proposedPath.length !== 1
    && submitState !== "submitting";

  const summary = useMemo(() => {
    const target = requiresRoute
      ? routeName.trim() || "Sin ruta indicada"
      : place.trim() || "Sin ubicación indicada";
    return `${selectedChoice.label} · ${target}`;
  }, [place, requiresRoute, routeName, selectedChoice.label]);

  function chooseReportType(value: CommunityReportType) {
    setReportType(value);
    if (!PATH_REPORT_TYPES.includes(value)) setProposedPath([]);
    if (value === "route_missing") {
      setSelectedRouteKey(CUSTOM_ROUTE_VALUE);
      setRouteName("");
    }
  }

  function chooseRoute(value: string) {
    setSelectedRouteKey(value);
    setProposedPath([]);
    if (value === CUSTOM_ROUTE_VALUE) {
      setRouteName("");
      return;
    }
    const selected = routeOptions.find((route) => route.slug === value);
    setRouteName(selected?.name ?? "");
  }

  async function submitReport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitState("submitting");
    setSubmitError("");

    try {
      const response = await fetch("/api/community/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportType,
          routeKey: requiresRoute && selectedRouteKey && selectedRouteKey !== CUSTOM_ROUTE_VALUE ? selectedRouteKey : null,
          routeName: requiresRoute ? routeName : null,
          place,
          description,
          expectedResult: null,
          contact,
          evidenceUrl,
          proposedPath: canProposePath && proposedPath.length >= 2 ? proposedPath : null,
          sourcePath: sourceUrl ? new URL(sourceUrl).pathname : window.location.pathname,
          website,
        }),
      });
      const result = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(result?.error || "No pudimos enviar el reporte.");
      setSubmitState("success");
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "No pudimos enviar el reporte.");
      setSubmitState("error");
    }
  }

  if (submitState === "success") {
    return (
      <section className="border-y border-[#6aab48]/30 bg-[#10180d] px-5 py-10 text-center sm:px-8" aria-live="polite">
        <CheckCircle2 className="mx-auto h-10 w-10 text-[var(--public-accent)]" aria-hidden="true" />
        <p className="mt-5 text-xs font-bold uppercase text-[var(--public-muted)]">Reporte recibido</p>
        <h2 className="mt-2 text-[var(--public-ink)] public-section-title">Gracias, ya quedó en revisión.</h2>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-[var(--public-secondary)]">
          Revisaremos la información y el recorrido que marcaste antes de hacer cambios en el mapa.
        </p>
        <button
          type="button"
          onClick={() => {
            setDescription("");
            setPlace("");
            setEvidenceUrl("");
            setProposedPath([]);
            setSubmitState("idle");
          }}
          className="mt-7 inline-flex h-11 items-center justify-center bg-[#6aab48] px-5 text-sm font-bold text-[#0c110a] transition hover:bg-[#79bd55]"
        >
          Enviar otro reporte
        </button>
      </section>
    );
  }

  const fieldClass = "mt-2 w-full border border-[#6aab48]/25 bg-[#0a1008] px-4 text-base text-[var(--public-ink)] outline-none placeholder:text-white/30 focus:border-[#b8e840]/70 focus:ring-2 focus:ring-[#b8e840]/10";

  return (
    <form className="border-y border-[var(--public-border)] bg-[#0f170c]" onSubmit={submitReport}>
      <section className="px-5 py-7 sm:px-8 sm:py-9" aria-labelledby="report-problem-title">
        <div className="flex items-center gap-3">
          <span className="grid h-7 w-7 place-items-center bg-[#b8e840] text-xs font-bold text-[#0c110a]">1</span>
          <h2 id="report-problem-title" className="text-[var(--public-ink)] public-section-title">¿Qué está mal?</h2>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {REPORT_CHOICES.map((choice, index) => {
            const Icon = choice.icon;
            const selected = reportType === choice.value;
            return (
              <label key={choice.value} className={`relative min-h-28 cursor-pointer border p-4 transition ${index === 0 ? "col-span-2 sm:col-span-3" : ""} ${selected ? "border-[#b8e840] bg-[#b8e840]/10" : "border-[var(--public-border)] bg-[#0a1008] hover:border-[#6aab48]/50"}`}>
                <input
                  type="radio"
                  name="reportType"
                  value={choice.value}
                  checked={selected}
                  onChange={() => chooseReportType(choice.value)}
                  className="sr-only"
                />
                <div className={index === 0 ? "flex items-center gap-4" : ""}>
                  <Icon className={`h-5 w-5 shrink-0 ${selected ? "text-[var(--public-accent)]" : "text-[var(--public-muted)]"}`} aria-hidden="true" />
                  <span className={index === 0 ? "block" : ""}>
                    <span className={`${index === 0 ? "" : "mt-3"} block text-sm font-bold leading-5 text-[var(--public-ink)]`}>{choice.label}</span>
                    <span className="mt-1 block text-[11px] leading-4 text-[var(--public-muted)]">{choice.hint}</span>
                  </span>
                </div>
              </label>
            );
          })}
        </div>
      </section>

      <section className="border-t border-[var(--public-border)] px-5 py-7 sm:px-8 sm:py-9" aria-labelledby="report-route-title">
        <div className="flex items-center gap-3">
          <span className="grid h-7 w-7 place-items-center bg-[#b8e840] text-xs font-bold text-[#0c110a]">2</span>
          <h2 id="report-route-title" className="text-[var(--public-ink)] public-section-title">{requiresRoute ? "¿Qué ruta es?" : "¿Dónde ocurrió?"}</h2>
        </div>

        {requiresRoute && (
          <div className="mt-5">
            <label htmlFor="report-route" className="text-xs font-bold uppercase text-[var(--public-muted)]">Elige una ruta</label>
            <select id="report-route" value={selectedRouteKey} onChange={(event) => chooseRoute(event.target.value)} required className={`${fieldClass} h-14`}>
              <option value="">Selecciona la ruta</option>
              {routeOptions.map((route) => <option key={route.slug} value={route.slug}>{route.name}</option>)}
              <option value={CUSTOM_ROUTE_VALUE}>No aparece en la lista</option>
            </select>
          </div>
        )}

        {isCustomRoute && (
          <label className="mt-4 block">
            <span className="text-xs font-bold uppercase text-[var(--public-muted)]">¿Cómo se conoce?</span>
            <input value={routeName} onChange={(event) => setRouteName(event.target.value)} required maxLength={120} placeholder="Ej. La Llanitos, Ruta 26..." className={`${fieldClass} h-14`} />
          </label>
        )}

        <label className="mt-4 block">
          <span className="text-xs font-bold uppercase text-[var(--public-muted)]">Calle, colonia o referencia <span className="normal-case text-[var(--public-muted)]">(opcional)</span></span>
          <input value={place} onChange={(event) => setPlace(event.target.value)} maxLength={180} placeholder="Ej. frente al Mercado Poniente" className={`${fieldClass} h-14`} />
        </label>

        {canProposePath && (
          <div className="mt-5 border-l-2 border-[#48cce0] bg-[#48cce0]/[0.06] p-4 sm:p-5">
            <p className="text-xs font-bold uppercase text-[#74dceb]">¿El recorrido del mapa está mal?</p>
            <h3 className="mt-2 text-lg font-bold text-[var(--public-ink)]">Marca por dónde pasa realmente.</h3>
            <p className="mt-1 text-xs leading-5 text-[var(--public-muted)]">Verás la ruta publicada como referencia. Toca las calles en orden para dibujar la corrección.</p>
            <div className="mt-4">
              <RouteProposalMap routeKey={selectedRouteKey} points={proposedPath} onChange={setProposedPath} />
            </div>
            {proposedPath.length === 1 && <p className="mt-2 text-xs text-[#f4df98]">Marca un segundo punto para formar el recorrido.</p>}
          </div>
        )}
      </section>

      <section className="border-t border-[var(--public-border)] px-5 py-7 sm:px-8 sm:py-9" aria-labelledby="report-detail-title">
        <div className="flex items-center gap-3">
          <span className="grid h-7 w-7 place-items-center bg-[#b8e840] text-xs font-bold text-[#0c110a]">3</span>
          <h2 id="report-detail-title" className="text-[var(--public-ink)] public-section-title">Cuéntanos qué cambió</h2>
        </div>
        <label className="mt-5 block">
          <span className="sr-only">Detalle del reporte</span>
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} required minLength={10} maxLength={2000} rows={5} placeholder={promptFor(reportType)} className={`${fieldClass} py-3 leading-6`} />
          <span className="mt-2 block text-xs text-[var(--public-muted)]">No necesitas escribir perfecto; con una referencia clara es suficiente.</span>
        </label>

        <details className="mt-5 border-y border-[var(--public-border)] py-4">
          <summary className="cursor-pointer text-sm font-bold text-[var(--public-secondary)]">Agregar contacto o evidencia <span className="font-normal text-[var(--public-muted)]">(opcional)</span></summary>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-bold uppercase text-[var(--public-muted)]">Contacto</span>
              <input value={contact} onChange={(event) => setContact(event.target.value)} maxLength={180} placeholder="Email o red social" className={`${fieldClass} h-12`} />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase text-[var(--public-muted)]">Enlace a foto o aviso</span>
              <input type="url" inputMode="url" value={evidenceUrl} onChange={(event) => setEvidenceUrl(event.target.value)} maxLength={500} pattern="https://.*" placeholder="https://..." className={`${fieldClass} h-12`} />
            </label>
          </div>
        </details>

        <label className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
          Sitio web
          <input name="website" value={website} onChange={(event) => setWebsite(event.target.value)} tabIndex={-1} autoComplete="off" />
        </label>

        {submitState === "error" && (
          <div className="mt-5 border-l-2 border-[#f4c84a] bg-[#f4c84a]/[0.07] px-4 py-3" role="alert">
            <p className="text-sm font-bold text-[#f4df98]">{submitError}</p>
            <p className="mt-1 text-xs leading-5 text-[var(--public-secondary)]">Tus datos siguen en el formulario. Intenta nuevamente en un momento.</p>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold text-[var(--public-secondary)]">{summary}</p>
            <p className="mt-1 max-w-md text-[11px] leading-5 text-[var(--public-muted)]">El reporte será privado hasta que se revise. No cambiaremos una ruta automáticamente.</p>
          </div>
          <button type="submit" disabled={!canSubmit} className="inline-flex h-12 min-w-48 items-center justify-center gap-2 bg-[#b8e840] px-6 text-sm font-bold text-[#0c110a] transition hover:bg-[#c7f35c] disabled:cursor-not-allowed disabled:opacity-40">
            {submitState === "submitting" ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
            {submitState === "submitting" ? "Enviando" : "Enviar reporte"}
          </button>
        </div>
      </section>
    </form>
  );
}
