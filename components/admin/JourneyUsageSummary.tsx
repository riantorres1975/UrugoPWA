import type { JourneyUsage } from "@/lib/journey-usage-server";

export default function JourneyUsageSummary({ usage, positive, total }: { usage: JourneyUsage | null; positive: number | null; total: number | null }) {
  return <section aria-label="Uso y utilidad de los viajes" className="admin-card my-6 p-4 sm:p-5">
    <p className="text-xs font-black uppercase tracking-wider text-[var(--brand-lime)]">Del plan al viaje</p>
    <h2 className="mt-1 text-xl font-bold">Uso y utilidad</h2>
    <p className="mt-2 text-sm leading-6 text-[var(--admin-muted)]">Actividad en las fechas elegidas. Los inicios cuentan al activar el modo viaje; las llegadas, al confirmar «Llegué a mi destino».</p>
    <dl className="mt-4 grid gap-3 sm:grid-cols-3">
      {[["Viajes iniciados", usage?.started ?? "—"], ["Llegadas confirmadas", usage?.arrived ?? "—"], ["Respuestas «Sí»", positive ?? "—"]].map(([label, value]) => <div key={label} className="rounded-xl border border-[var(--admin-line)] p-3">
        <dt className="text-xs text-[var(--admin-muted)]">{label}</dt><dd className="mt-1 text-3xl font-bold tabular-nums">{value}</dd>
      </div>)}
    </dl>
    {!usage && <p role="status" className="mt-3 text-sm text-amber-200">No se pudo cargar la actividad de viajes. Las opiniones se consultan por separado.</p>}
    <p className="mt-3 text-xs leading-5 text-[var(--admin-muted)]">{total === null ? "Opiniones no disponibles. " : `${total} opiniones recibidas en estas fechas. `}Las opiniones pueden enviarse sin iniciar un viaje y no se vinculan a un viaje individual. Las llegadas pueden corresponder a viajes iniciados otro día; estos contadores no representan una tasa de conversión. Salir del modo viaje no confirma una llegada.</p>
    {usage && usage.days.length > 0 && <details className="mt-4 border-t border-[var(--admin-line)] pt-3">
      <summary className="min-h-11 cursor-pointer text-sm font-semibold">Ver actividad por día</summary>
      <div className="mt-2 max-h-72 overflow-auto"><table className="w-full text-left text-xs tabular-nums">
        <caption className="sr-only">Inicios y llegadas por fecha local de Uruapan</caption>
        <thead><tr className="text-[var(--admin-muted)]"><th scope="col" className="py-2">Fecha</th><th scope="col" className="py-2">Inicios</th><th scope="col" className="py-2">Llegadas</th></tr></thead>
        <tbody>{usage.days.map((day) => <tr key={day.day} className="border-t border-[var(--admin-line)]"><th scope="row" className="py-2 font-normal">{day.day}</th><td>{day.started}</td><td>{day.arrived}</td></tr>)}</tbody>
      </table></div>
    </details>}
  </section>;
}
