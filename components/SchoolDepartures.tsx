import Link from "next/link";
import {
  ArrowRight,
  BusFront,
  CircleAlert,
  Clock3,
  ExternalLink,
  GraduationCap,
} from "lucide-react";
import {
  formatSchoolDepartureTime,
  SCHOOL_DEPARTURE_COUNT,
  SCHOOL_DEPARTURE_GROUPS,
} from "@/lib/school-departures";

const officialSources = [
  { label: "CETIS 27", href: "https://cetis27.edu.mx/" },
  { label: "Tec Uruapan", href: "https://tecuruapan.edu.mx/" },
  { label: "UPU", href: "https://upu.edu.mx/" },
] as const;

export default function SchoolDepartures() {
  return (
    <section id="salidas-escolares" className="scroll-mt-28 border-t border-[var(--public-border)] pt-12" aria-labelledby="school-departures-title">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="flex items-center gap-2 text-xs font-bold uppercase text-[#f1bf62]">
            <GraduationCap className="h-4 w-4" aria-hidden="true" />
            Salidas escolares reportadas
          </p>
          <h2 id="school-departures-title" className="mt-3 public-section-title">
            Corridas que extienden su ruta para llegar a clases.
          </h2>
          <p className="mt-3 text-sm leading-7 text-[var(--public-secondary)]">
            Son salidas especiales de una sola dirección. Después de clases, el regreso se realiza con las rutas regulares disponibles.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3 text-sm text-[var(--public-ink)]">
          <BusFront className="h-5 w-5 text-[#f1bf62]" aria-hidden="true" />
          <span><strong className="text-[var(--public-ink)]">{SCHOOL_DEPARTURE_COUNT}</strong> referencias comunitarias</span>
        </div>
      </div>

      <div className="mt-7 border-y border-[#f1bf62]/25 bg-[#f1bf62]/[0.06] px-4 py-4 sm:px-5">
        <div className="flex items-start gap-3">
          <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-[#f1bf62]" aria-hidden="true" />
          <div>
            <p className="text-sm font-bold text-[#f4d38e]">Confirma antes de salir</p>
            <p className="mt-1 text-xs leading-5 text-[#c6b17f]">
              Los horarios, días, puntos de abordaje y destinos pueden cambiar por ciclo escolar. Estas referencias no están certificadas por los planteles ni por el operador.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-9 space-y-10">
        {SCHOOL_DEPARTURE_GROUPS.map((group) => (
          <section key={group.id} aria-labelledby={`school-group-${group.id}`}>
            <div className="grid gap-2 border-b border-[var(--public-border)] pb-4 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] md:items-end">
              <h3 id={`school-group-${group.id}`} className="font-sans text-2xl font-bold text-[var(--public-ink)]">
                {group.title}
              </h3>
              <p className="text-xs leading-5 text-[var(--public-muted)] md:text-right">{group.description}</p>
            </div>

            <ul>
              {group.departures.map((departure) => (
                <li
                  key={departure.id}
                  className="grid gap-3 border-b border-[var(--public-border)] py-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_auto] sm:items-center"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[var(--public-ink)]">{departure.origin}</p>
                    {departure.regularRoute ? (
                      <Link
                        href={`/ruta/${departure.regularRoute.slug}`}
                        prefetch={false}
                        className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-[var(--public-accent)] transition hover:text-white"
                      >
                        Ver recorrido normal de {departure.regularRoute.name}
                        <ArrowRight className="h-3 w-3" aria-hidden="true" />
                      </Link>
                    ) : null}
                  </div>

                  <div className="min-w-0">
                    <p className="flex items-start gap-2 text-xs font-semibold leading-5 text-[var(--public-secondary)]">
                      <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#f1bf62]" aria-hidden="true" />
                      <span>{departure.destination}</span>
                    </p>
                    {departure.note ? <p className="mt-1 text-[11px] leading-4 text-[var(--public-muted)]">{departure.note}</p> : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 sm:justify-end" aria-label={`Salidas reportadas desde ${departure.origin}`}>
                    {departure.departures.map((time) => (
                      <span
                        key={time}
                        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#f1bf62]/25 bg-[#f1bf62]/[0.07] px-3 text-xs font-bold text-[#f4d38e]"
                      >
                        <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                        {formatSchoolDepartureTime(time)}
                      </span>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <div className="mt-8 grid gap-5 border-b border-[var(--public-border)] pb-10 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <p className="text-xs font-bold uppercase text-[var(--public-muted)]">Consulta fuentes oficiales</p>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
            {officialSources.map((source) => (
              <a
                key={source.href}
                href={source.href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--public-accent)] transition hover:text-white"
              >
                {source.label}
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
            ))}
          </div>
        </div>
        <Link
          href="/reportar-error"
          className="inline-flex h-11 items-center justify-center rounded-md border border-[var(--public-border)] px-5 text-sm font-bold text-[var(--public-ink)] transition hover:border-[#f1bf62]/40 hover:bg-[#f1bf62]/[0.06]"
        >
          Confirmar o corregir una salida
        </Link>
      </div>
    </section>
  );
}
