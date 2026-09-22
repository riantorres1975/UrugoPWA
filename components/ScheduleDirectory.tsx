"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { getScheduleStatus, type RouteSchedule, type ScheduleStatus } from "@/lib/schedules";

export type ScheduleService = {
  name: string;
  destination: string | null;
  slug: string;
  color: string;
  kind: "bus" | "teleferico";
  schedule: RouteSchedule;
};

type Filter = "all" | "operating" | "closing" | "teleferico";

const filters: { value: Filter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "operating", label: "En servicio ahora" },
  { value: "closing", label: "Por cerrar" },
  { value: "teleferico", label: "Teleférico" },
];

const TIME_ZONE = "America/Mexico_City";

function normalize(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function frequencyLabel(schedule: RouteSchedule) {
  if (schedule.continuous) return "Cada 5 min";
  return schedule.freqMin === schedule.freqMax
    ? `Cada ${schedule.freqMin} min`
    : `Cada ${schedule.freqMin}–${schedule.freqMax} min`;
}

function isOperating(status: ScheduleStatus | null) {
  return status?.kind === "operating" || status?.kind === "continuous" || status?.kind === "last-service";
}

function StatusBadge({ status }: { status: ScheduleStatus | null }) {
  if (!status) {
    return <span className="text-xs font-semibold text-[var(--public-muted)]">Consultando…</span>;
  }

  if (status.kind === "last-service") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#f1bf62]">
        <span className="h-2 w-2 rounded-full bg-[#f1bf62]" />
        Por cerrar · {status.minutesLeft} min
      </span>
    );
  }

  if (status.kind === "operating" || status.kind === "continuous") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#72d489]">
        <span className="h-2 w-2 rounded-full bg-[#72d489]" />
        En servicio
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--public-muted)]">
      <span className="h-2 w-2 rounded-full bg-[#78965f]" />
      Sin servicio
    </span>
  );
}

export default function ScheduleDirectory({ services }: { services: ScheduleService[] }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const refresh = () => setNow(new Date());
    refresh();
    const timer = window.setInterval(refresh, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const withStatus = useMemo(
    () => services.map((service) => ({
      ...service,
      status: now ? getScheduleStatus(service.schedule, now, TIME_ZONE) : null,
    })),
    [now, services],
  );

  const visible = useMemo(() => {
    const tokens = normalize(query.trim()).split(/\s+/).filter(Boolean);
    return withStatus.filter((service) => {
      const matchesSearch = tokens.every((token) => normalize(`${service.name} ${service.destination ?? ""}`).includes(token));
      const matchesFilter = filter === "all"
        || (filter === "operating" && isOperating(service.status))
        || (filter === "closing" && service.status?.kind === "last-service")
        || (filter === "teleferico" && service.kind === "teleferico");
      return matchesSearch && matchesFilter;
    });
  }, [filter, query, withStatus]);

  const operatingCount = withStatus.filter((service) => isOperating(service.status)).length;
  const uruapanTime = now
    ? new Intl.DateTimeFormat("es-MX", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit", hour12: false }).format(now)
    : "--:--";

  return (
    <section className="public-directory -mx-5 mt-3 px-5 py-4 sm:mx-0 sm:rounded-xl sm:px-5" aria-label="Consulta de horarios">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-[var(--public-secondary)]">
        <p className="font-semibold">Uruapan <span className="ml-1 font-bold tabular-nums text-[var(--public-ink)]">{uruapanTime}</span></p>
        <p>{now ? `${operatingCount} de ${services.length} en horario de servicio` : "Consultando servicios…"}</p>
      </div>
      <p className="mt-1 text-xs leading-5 text-[var(--public-muted)]">Horarios aproximados; el paso puede variar por tráfico.</p>

      <div className="sticky top-[72px] z-20 -mx-1 bg-[var(--public-bg)] px-1 pb-2 pt-3">
        <div className="relative">
        <label className="block">
          <span className="sr-only">Buscar ruta o destino</span>
          <svg viewBox="0 0 24 24" fill="none" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--public-muted)]" aria-hidden="true">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
            <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            inputMode="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Busca una ruta o destino"
            className="h-11 w-full rounded-lg border border-[var(--public-border)] bg-[var(--public-surface)] pl-12 pr-12 text-sm text-[var(--public-ink)] outline-none placeholder:text-[var(--public-muted)] focus-visible:ring-2 focus-visible:ring-[var(--public-accent)]"
          />
        </label>
        {query && <button type="button" aria-label="Limpiar búsqueda" onClick={() => { setQuery(""); inputRef.current?.focus(); }} className="absolute right-0 top-0 grid h-11 w-11 place-items-center rounded-md text-[var(--public-secondary)] hover:text-[var(--public-ink)]">
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
        </button>}
        </div>
        <div className="mt-1.5 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Filtrar horarios">
          {filters.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => {
                setFilter(item.value);
                if (item.value === "teleferico") setQuery("");
              }}
              aria-pressed={filter === item.value}
              className="min-h-11 shrink-0 rounded-md border px-3 text-xs font-bold transition"
              style={{
                borderColor: filter === item.value ? "#6aab48" : "var(--public-border)",
                background: filter === item.value ? "var(--public-surface)" : "transparent",
                color: filter === item.value ? "var(--public-accent)" : "var(--public-secondary)",
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <p aria-live="polite" className="mb-2 text-xs font-semibold text-[var(--public-muted)]">
        {visible.length} {visible.length === 1 ? "servicio" : "servicios"}
      </p>

      {visible.length > 0 && <ul aria-label="Horarios de rutas" className="divide-y divide-[var(--public-border)] overflow-hidden rounded-lg border border-[var(--public-border)] bg-[var(--public-surface)]">
        {visible.map((service) => (
          <li key={service.slug}>
            <Link
              href={service.kind === "teleferico" ? "/teleferico-uruapan-horario" : `/ruta/${service.slug}`}
              prefetch={false}
              aria-label={`Ver detalles de ${service.name}`}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-3 py-3 transition-colors hover:bg-[var(--public-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--public-accent)] lg:grid-cols-[minmax(0,1fr)_150px_260px_16px] lg:px-4"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="h-8 w-1 shrink-0 rounded-full" style={{ backgroundColor: service.color }} aria-hidden="true" />
                <div>
                  <p className="text-sm font-bold leading-5">{service.name}</p>
                  {service.destination && <p className="mt-0.5 text-xs leading-4 text-[var(--public-secondary)]">{service.destination}</p>}
                </div>
              </div>
              <div className="max-w-[100px] text-right lg:max-w-none lg:text-left"><StatusBadge status={service.status} /></div>
              <dl className="col-span-2 flex flex-wrap gap-x-5 gap-y-1 pl-3.5 lg:col-span-1 lg:pl-0">
                <div>
                  <dt className="text-[11px] text-[var(--public-muted)]">Horario</dt>
                  <dd className="text-xs font-bold leading-5 tabular-nums"><span className="sr-only">Inicio </span>{service.schedule.first}<span aria-hidden="true"> – </span><span className="sr-only"> a cierre </span>{service.schedule.last}</dd>
                </div>
                <div>
                  <dt className="text-[11px] text-[var(--public-muted)]">Frecuencia</dt>
                  <dd className="text-xs leading-5 text-[var(--public-secondary)]">{frequencyLabel(service.schedule)}</dd>
                </div>
              </dl>
              <span className="hidden text-[var(--public-accent)] lg:block" aria-hidden="true">→</span>
            </Link>
          </li>
        ))}
      </ul>}

      {visible.length === 0 && (
        <div className="rounded-lg border border-[var(--public-border)] px-5 py-12 text-center text-sm text-[var(--public-secondary)]">
          <p>No hay servicios que coincidan con este filtro.</p>
          <button type="button" onClick={() => { setQuery(""); setFilter("all"); }} className="mt-3 min-h-11 rounded-md border border-[var(--public-border)] px-4 font-bold text-[var(--public-accent)]">Ver todos los horarios</button>
        </div>
      )}
    </section>
  );
}
