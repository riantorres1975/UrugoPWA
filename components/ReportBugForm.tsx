"use client";
import Link from "next/link";

import { rememberReportReceipt } from "@/lib/report-history";
import {
  Ban,
  BusFront,
  CheckCircle2,
  CircleEllipsis,
  Clock3,
  LoaderCircle,
  MapPin,
  MapPinned,
  PlayCircle,
  Send,
  Smartphone,
  Trash2,
  X,
} from "lucide-react";
import { useMemo, useRef, useState, useSyncExternalStore } from "react";
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
  const [proposalDirection, setProposalDirection] = useState("");
  const [website, setWebsite] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [submitError, setSubmitError] = useState("");
  const submitting = useRef(false);
  const [showRouteGuide, setShowRouteGuide] = useState(false);
  const sourceUrl = useSyncExternalStore(subscribeBrowserContext, getSourceUrl, () => "");

  const selectedChoice = REPORT_CHOICES.find((choice) => choice.value === reportType) ?? REPORT_CHOICES[0];
  const requiresRoute = ROUTE_REPORT_TYPES.includes(reportType);
  const canProposePath = Boolean(
    PATH_REPORT_TYPES.includes(reportType)
    && selectedRouteKey
    && selectedRouteKey !== CUSTOM_ROUTE_VALUE,
  );
  const isCustomRoute = requiresRoute && selectedRouteKey === CUSTOM_ROUTE_VALUE;
  const hasPath = canProposePath && proposedPath.length >= 2;
  const canSubmit = (description.trim().length >= 10 || (hasPath && !description.trim()))
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
    if (!PATH_REPORT_TYPES.includes(value)) {
      setProposedPath([]);
      setShowRouteGuide(false);
    }
    if (value === "route_missing") {
      setSelectedRouteKey(CUSTOM_ROUTE_VALUE);
      setRouteName("");
    }
  }

  function chooseRoute(value: string) {
    setSelectedRouteKey(value);
    setProposedPath([]);
    setProposalDirection("");
    if (value === CUSTOM_ROUTE_VALUE) {
      setRouteName("");
      return;
    }
    const selected = routeOptions.find((route) => route.slug === value);
    setRouteName(selected?.name ?? "");
  }

  async function submitReport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit || submitting.current) return;
    submitting.current = true;
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
          description: description.trim() || `El camión pasa por el tramo marcado en el mapa. Propongo corregir el recorrido de ${routeName}.`,
          expectedResult: hasPath ? `Tramo propuesto para revisión. Sentido de referencia: ${proposalDirection || "no indicado"}. Los puntos siguen el orden del viaje; no sustituyen automáticamente el recorrido completo.` : null,
          contact,
          evidenceUrl,
          proposedPath: canProposePath && proposedPath.length >= 2 ? proposedPath : null,
          sourcePath: sourceUrl ? new URL(sourceUrl).pathname : window.location.pathname,
          website,
        }),
        signal: AbortSignal.timeout(15000),
      });
      const result = (await response.json().catch(() => null)) as { error?: string; receipt?: string } | null;
      if (!response.ok) throw new Error(result?.error || "No pudimos enviar el reporte.");
      rememberReportReceipt(result?.receipt, routeName || "Reporte de la app");
      setSubmitState("success");
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "No pudimos enviar el reporte.");
      setSubmitState("error");
    } finally { submitting.current = false; }
  }

  if (submitState === "success") {
    return (
      <section className="border-y border-[#6aab48]/30 rounded-2xl bg-[var(--public-tint)] px-5 py-10 text-center sm:px-8" aria-live="polite">
        <CheckCircle2 className="mx-auto h-10 w-10 text-[var(--public-accent)]" aria-hidden="true" />
        <p className="mt-5 text-xs font-bold uppercase text-[var(--public-muted)]">Reporte recibido</p>
        <h2 className="mt-2 text-[var(--public-ink)] public-section-title">Gracias, recibimos tu reporte.</h2>
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
          className="mt-7 inline-flex h-11 items-center justify-center bg-[var(--brand-lime)] px-5 text-sm font-bold text-[var(--brand-deep)] transition hover:bg-[#e7ffa7]"
        >
          Enviar otro reporte
        </button>
        <Link href="/#tu-dia" className="mt-3 block min-h-11 py-3 text-sm font-bold text-[var(--public-accent)] underline">Consultar mis reportes</Link>
      </section>
    );
  }

  const fieldClass = "mt-2 w-full rounded-lg border border-[var(--public-border)] bg-[var(--public-surface)] px-4 text-base text-[var(--public-ink)] outline-none placeholder:text-[var(--public-muted)] focus:border-[#b8e840]/70 focus:ring-2 focus:ring-[#b8e840]/10";

  return (
    <form className="overflow-hidden rounded-2xl border border-[var(--public-border)] bg-[var(--public-surface)]" onSubmit={submitReport}>
      <section className="px-4 py-5 sm:px-8 sm:py-7" aria-labelledby="report-problem-title">
        <div className="flex items-center gap-3">
          <span className="grid h-7 w-7 place-items-center bg-[var(--brand-lime)] text-xs font-bold text-[var(--brand-deep)]">1</span>
          <h2 id="report-problem-title" className="text-xl font-bold text-[var(--public-ink)]">¿Qué está mal?</h2>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {REPORT_CHOICES.map((choice, index) => {
            const Icon = choice.icon;
            const selected = reportType === choice.value;
            return (
              <label key={choice.value} className={`relative flex min-h-16 cursor-pointer items-center rounded-xl border p-3 transition focus-within:ring-2 focus-within:ring-[var(--public-accent)] ${index === 0 ? "col-span-2 sm:col-span-3" : ""} ${selected ? "border-[var(--public-accent)] bg-[var(--public-tint)]" : "border-[var(--public-border)] bg-[var(--public-surface)] hover:border-[#6aab48]/50"}`}>
                <input
                  type="radio"
                  name="reportType"
                  value={choice.value}
                  checked={selected}
                  onChange={() => chooseReportType(choice.value)}
                  className="sr-only"
                />
                <div className="flex items-center gap-3">
                  <Icon className={`h-5 w-5 shrink-0 ${selected ? "text-[var(--public-accent)]" : "text-[var(--public-muted)]"}`} aria-hidden="true" />
                  <span className={index === 0 ? "block" : ""}>
                    <span className="block text-sm font-bold leading-5 text-[var(--public-ink)]">{choice.label}</span>
                    <span className="mt-1 hidden text-xs leading-4 text-[var(--public-muted)] sm:block">{choice.hint}</span>
                  </span>
                </div>
              </label>
            );
          })}
        </div>
      </section>

      <section className="border-t border-[var(--public-border)] px-4 py-5 sm:px-8 sm:py-7" aria-labelledby="report-route-title">
        <div className="flex items-center gap-3">
          <span className="grid h-7 w-7 place-items-center bg-[var(--brand-lime)] text-xs font-bold text-[var(--brand-deep)]">2</span>
          <h2 id="report-route-title" className="text-xl font-bold text-[var(--public-ink)]">{requiresRoute ? "¿Qué ruta es?" : "¿Dónde ocurrió?"}</h2>
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

        {canProposePath && (
          <div className="mt-5 rounded-2xl border border-[var(--public-border)] bg-[var(--public-tint)] p-3 sm:p-5">
            <h3 className="text-base font-bold text-[var(--public-ink)]">Marca por dónde pasa realmente.</h3>
            <p className="mt-1 text-sm leading-6 text-[var(--public-secondary)]">Dibuja solo el tramo que cambió. No necesitas marcar toda la ruta.</p>
            <div className="mt-3">
              <RouteProposalMap key={selectedRouteKey} routeKey={selectedRouteKey} points={proposedPath} onChange={setProposedPath} direction={proposalDirection} onDirectionChange={setProposalDirection} />
            </div>
            <button type="button" onClick={() => setShowRouteGuide(v => !v)} aria-expanded={showRouteGuide} aria-controls="route-report-guide" className="mt-2 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[var(--public-teal)]">
              {showRouteGuide ? <X size={17} aria-hidden="true" /> : <PlayCircle size={17} aria-hidden="true" />}{showRouteGuide ? "Ocultar ejemplo" : "Ver ejemplo"}
            </button>
            {showRouteGuide && <ol id="route-report-guide" className="mt-1 space-y-2 text-sm leading-6 text-[var(--public-secondary)]">
              <li><strong>1.</strong> Mueve el mapa hasta que la mira esté en el inicio del cambio.</li>
              <li><strong>2.</strong> Pulsa “Agregar punto”. Repite en cada esquina, en el orden del viaje.</li>
              <li><strong>3.</strong> Toca un número para corregirlo. Al terminar, pulsa “Usar este tramo”.</li>
            </ol>}
            {proposedPath.length > 0 && <button type="button" onClick={() => { setProposedPath([]); setProposalDirection(""); }} className="mt-2 flex min-h-11 items-center gap-2 text-sm font-semibold text-[var(--public-secondary)]"><Trash2 size={16} aria-hidden="true" />Quitar tramo del reporte</button>}
            {proposedPath.length === 1 && <p role="status" className="mt-2 text-sm text-[var(--public-amber)]">Tu tramo tiene un punto. Agrega otro o quítalo para enviar solo la descripción.</p>}
          </div>
        )}
        <label className="mt-4 block">
          <span className="text-xs font-bold uppercase text-[var(--public-muted)]">Calle, colonia o referencia <span className="normal-case text-[var(--public-muted)]">(opcional)</span></span>
          <input value={place} onChange={(event) => setPlace(event.target.value)} maxLength={180} placeholder="Ej. frente al Mercado Poniente" className={`${fieldClass} h-14`} />
        </label>

      </section>

      <section className="border-t border-[var(--public-border)] px-4 py-5 sm:px-8 sm:py-7" aria-labelledby="report-detail-title">
        <div className="flex items-center gap-3">
          <span className="grid h-7 w-7 place-items-center bg-[var(--brand-lime)] text-xs font-bold text-[var(--brand-deep)]">3</span>
          <h2 id="report-detail-title" className="text-xl font-bold text-[var(--public-ink)]">Cuéntanos qué cambió</h2>
        </div>
        <label className="mt-5 block">
          <span className="text-sm font-semibold text-[var(--public-secondary)]">Detalle del reporte {hasPath && <span className="font-normal">(opcional: ya marcaste el tramo)</span>}</span>
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} required={!hasPath} minLength={10} maxLength={2000} rows={3} placeholder={promptFor(reportType)} className={`${fieldClass} py-3 leading-6`} />
          <span className="mt-2 block text-xs text-[var(--public-muted)]">{hasPath ? "El dibujo basta. Puedes agregar una referencia o desde cuándo cambió." : "Escribe al menos 10 caracteres. Una calle o referencia nos ayuda."}</span>
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
            <p className="text-sm font-bold text-[var(--public-amber)]">{submitError}</p>
            <p className="mt-1 text-xs leading-5 text-[var(--public-secondary)]">Tus datos siguen en el formulario. Intenta nuevamente en un momento.</p>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold text-[var(--public-secondary)]">{summary}</p>
            <p className="mt-1 max-w-md text-[11px] leading-5 text-[var(--public-muted)]">El reporte será privado hasta que se revise. No cambiaremos una ruta automáticamente.</p>
          </div>
          <button type="submit" disabled={!canSubmit} className="inline-flex h-12 min-w-48 items-center justify-center gap-2 bg-[var(--brand-lime)] px-6 text-sm font-bold text-[var(--brand-deep)] transition hover:bg-[#e7ffa7] disabled:cursor-not-allowed disabled:opacity-40">
            {submitState === "submitting" ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
            {submitState === "submitting" ? "Enviando" : "Enviar reporte"}
          </button>
        </div>
      </section>
    </form>
  );
}
