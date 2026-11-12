"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Search, X } from "lucide-react";
import TransportRouteBadge from "@/components/TransportRouteBadge";
import { matchesPublicRoute } from "@/lib/public-route-search";
import { getRouteSearchTerms } from "@/lib/route-names";
import { useDirectoryUrl } from "@/lib/use-directory-url";
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
  { value: "operating", label: "En horario" },
  { value: "closing", label: "Por cerrar" },
  { value: "teleferico", label: "Teleférico" },
];

const TIME_ZONE = "America/Mexico_City";

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
      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--public-amber)]">
        <span className="h-2 w-2 rounded-full bg-[#f1bf62]" />
        Por cerrar · {status.minutesLeft} min
      </span>
    );
  }

  if (status.kind === "operating" || status.kind === "continuous") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--public-accent)]">
        <span className="h-2 w-2 rounded-full bg-[#72d489]" />
        En horario
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--public-muted)]">
      <span className="h-2 w-2 rounded-full bg-[#78965f]" />
      Fuera de horario
    </span>
  );
}

export default function ScheduleDirectory({ services }: { services: ScheduleService[] }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [now, setNow] = useState<Date | null>(null);
  useDirectoryUrl(query, setQuery);

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
    return withStatus.filter((service) => {
      const matchesSearch = matchesPublicRoute(query, service.name, [service.name, service.destination, ...getRouteSearchTerms(service.name)].join(" "));
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
    <section className="transport-directory" aria-label="Consulta de horarios">
      <div className="schedule-clock">
        <p>Hora de Uruapan {now ? <time dateTime={now.toISOString()}>{uruapanTime}</time> : <span>--:--</span>}</p>
        <p>{now ? <><strong>{operatingCount}</strong> de {services.length} en horario de servicio</> : "Consultando horarios…"}</p>
      </div>
      <div className="public-directory transport-toolbar">
        <div className="transport-search">
          <Search aria-hidden="true" />
          <input ref={inputRef} type="text" inputMode="search" maxLength={120} autoComplete="off"
            aria-label="Buscar ruta o destino" aria-controls="schedule-results"
            value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Busca ruta o destino…" />
          {query && <button type="button" aria-label="Limpiar búsqueda" onClick={() => { setQuery(""); inputRef.current?.focus(); }}><X className="h-4 w-4" aria-hidden="true" /></button>}
        </div>
        <div className="transport-chips" aria-label="Filtrar horarios">
          {filters.map((item) => <button key={item.value} type="button" className="transport-chip" aria-pressed={filter === item.value}
            onClick={() => { setFilter(item.value); if (item.value === "teleferico") setQuery(""); }}>
            {item.label}
          </button>)}
        </div>
        <div className="transport-results"><p aria-live="polite" aria-atomic="true">{visible.length} {visible.length === 1 ? "servicio" : "servicios"}</p>
          {(query || filter !== "all") && <button type="button" onClick={() => { setQuery(""); setFilter("all"); }}>Limpiar filtros</button>}
        </div>
        <p className="schedule-note">El estado se calcula con el horario aproximado. No muestra la ubicación de los camiones.</p>
      </div>
      <div className="schedule-table-head" aria-hidden="true"><span>Ruta y destino</span><span>Según horario</span><span>Primer / último servicio</span><span>Frecuencia aprox.</span><span /></div>
      <div id="schedule-results">
        {visible.length > 0 && <ul aria-label="Horarios de rutas" className="schedule-list">
          {visible.map((service) => <li key={service.slug}>
            <Link href={service.kind === "teleferico" ? "/teleferico-uruapan-horario" : "/ruta/" + service.slug} prefetch={false}
              aria-label={"Ver detalles de " + service.name} className="schedule-row">
              <div className="schedule-route"><TransportRouteBadge name={service.name} color={service.color} />
                <div className="transport-route-copy"><strong>{service.name}</strong>{service.destination && <small>{service.destination}</small>}</div>
              </div>
              <div className="schedule-status"><StatusBadge status={service.status} /></div>
              <dl>
                <div><dt>Horario</dt><dd><span className="sr-only">Inicio </span>{service.schedule.first}<span aria-hidden="true"> – </span><span className="sr-only"> a cierre </span>{service.schedule.last}</dd></div>
                <div className="schedule-frequency"><dt>Frecuencia</dt><dd>{frequencyLabel(service.schedule)}</dd></div>
              </dl>
              <ArrowRight className="h-4 w-4 text-[var(--public-accent)]" aria-hidden="true" />
            </Link>
          </li>)}
        </ul>}
        {visible.length === 0 && <div className="transport-empty">
          <p className="font-bold">No encontramos horarios con estos filtros.</p>
          <p>Prueba otro destino o vuelve a consultar todos los servicios.</p>
          <button type="button" onClick={() => { setQuery(""); setFilter("all"); }} className="transport-button mt-4">Ver todos los horarios</button>
        </div>}
      </div>
    </section>
  );
}
