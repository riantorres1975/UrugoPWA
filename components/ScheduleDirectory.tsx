"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
    const search = normalize(query.trim());
    return withStatus.filter((service) => {
      const matchesSearch = !search || normalize(`${service.name} ${service.destination ?? ""}`).includes(search);
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
    <section className="public-directory -mx-5 mt-8 px-5 pb-6 sm:mx-0 sm:px-6" aria-label="Consulta de horarios">
      <div className="grid gap-3 border-y border-[var(--public-border)] py-5 sm:grid-cols-[1fr_auto] sm:items-center">
        <div>
          <p className="text-xs font-bold uppercase text-[var(--public-muted)]">Ahora en Uruapan · {uruapanTime}</p>
          <p className="mt-1 text-sm font-semibold text-[var(--public-ink)]">
            {now ? `${operatingCount} de ${services.length} servicios operando` : "Consultando servicios…"}
          </p>
        </div>
        <Link href="/mapa" className="text-sm font-bold text-[var(--public-accent)] transition hover:opacity-80">
          Planear un viaje →
        </Link>
      </div>

      <div className="sticky top-[72px] z-20 -mx-1 bg-[var(--public-bg)] px-1 py-4">
        <label className="relative block">
          <span className="sr-only">Buscar ruta o destino</span>
          <svg viewBox="0 0 24 24" fill="none" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--public-muted)]" aria-hidden="true">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
            <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Busca una ruta o destino"
            className="h-12 w-full rounded-lg border border-[var(--public-border)] bg-[var(--public-surface)] pl-12 pr-4 text-sm text-[var(--public-ink)] outline-none placeholder:text-[var(--public-muted)] focus:border-[#b8e840]/50"
          />
        </label>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Filtrar horarios">
          {filters.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => {
                setFilter(item.value);
                if (item.value === "teleferico") setQuery("");
              }}
              aria-pressed={filter === item.value}
              className="shrink-0 rounded-md border px-3 py-1.5 text-xs font-bold transition"
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

      <p className="mb-4 text-xs font-semibold uppercase text-[var(--public-muted)]">
        {visible.length} {visible.length === 1 ? "servicio" : "servicios"}
      </p>

      <div className="overflow-hidden rounded-lg border border-[var(--public-border)] bg-[var(--public-surface)] md:hidden">
        <ul className="divide-y divide-[var(--public-border)]">
          {visible.map((service) => (
            <li key={service.slug} className="p-4 [contain-intrinsic-size:auto_150px] [content-visibility:auto]">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-2.5">
                  <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: service.color }} />
                  <div className="min-w-0">
                    <p className="text-sm font-bold leading-5 text-[var(--public-ink)]">{service.name}</p>
                    {service.destination && <p className="mt-0.5 text-[11px] leading-4 text-[var(--public-muted)]">→ {service.destination}</p>}
                  </div>
                </div>
                <Link
                  href={service.kind === "teleferico" ? "/teleferico-uruapan-horario" : `/ruta/${service.slug}`}
                  prefetch={false}
                  className="shrink-0 text-xs font-bold text-[var(--public-accent)] transition hover:opacity-80"
                >
                  Ver →
                </Link>
              </div>
              <div className="mt-3"><StatusBadge status={service.status} /></div>
              <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-[var(--public-border)] pt-3">
                <div><dt className="text-[9px] font-bold uppercase text-[var(--public-muted)]">Primero</dt><dd className="mt-1 text-sm font-bold text-[var(--public-ink)]">{service.schedule.first}</dd></div>
                <div><dt className="text-[9px] font-bold uppercase text-[var(--public-muted)]">Último</dt><dd className="mt-1 text-sm font-bold text-[var(--public-ink)]">{service.schedule.last}</dd></div>
                <div><dt className="text-[9px] font-bold uppercase text-[var(--public-muted)]">Frecuencia</dt><dd className="mt-1 text-xs leading-5 text-[var(--public-secondary)]">{frequencyLabel(service.schedule)}</dd></div>
              </dl>
            </li>
          ))}
        </ul>
      </div>

      <div className="hidden overflow-x-auto rounded-lg border border-[var(--public-border)] bg-[var(--public-surface)] md:block">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <caption className="sr-only">Estado, horarios y frecuencia del transporte público en Uruapan</caption>
          <thead><tr className="border-b border-[var(--public-border)]">
            {['Servicio', 'Ahora', 'Primero', 'Último', 'Frecuencia', ''].map((label) => <th key={label || 'action'} scope="col" className="px-4 py-3 text-xs font-bold uppercase text-[var(--public-muted)]">{label || <span className="sr-only">Acciones</span>}</th>)}
          </tr></thead>
          <tbody>
            {visible.map((service) => (
              <tr key={service.slug} className="border-b border-[var(--public-border)] [contain-intrinsic-size:auto_64px] [content-visibility:auto] last:border-b-0">
                <th scope="row" className="px-4 py-3 font-semibold text-[var(--public-ink)]">
                  <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: service.color }} /><span>{service.name}{service.destination && <span className="block text-[11px] font-normal text-[var(--public-muted)]">→ {service.destination}</span>}</span></span>
                </th>
                <td className="px-4 py-3"><StatusBadge status={service.status} /></td>
                <td className="px-4 py-3 font-semibold text-[var(--public-ink)]">{service.schedule.first}</td>
                <td className="px-4 py-3 font-semibold text-[var(--public-ink)]">{service.schedule.last}</td>
                <td className="px-4 py-3 text-[var(--public-secondary)]">{frequencyLabel(service.schedule)}</td>
                <td className="px-4 py-3 text-right"><Link href={service.kind === "teleferico" ? "/teleferico-uruapan-horario" : `/ruta/${service.slug}`} prefetch={false} className="whitespace-nowrap text-xs font-bold text-[var(--public-accent)]">Ver →</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {visible.length === 0 && (
        <div className="rounded-lg border border-[var(--public-border)] px-5 py-12 text-center text-sm text-[var(--public-secondary)]">
          No hay servicios que coincidan con este filtro.
        </div>
      )}
    </section>
  );
}
