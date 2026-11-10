import Link from "next/link";
import { redirect } from "next/navigation";
import AdminHeader from "@/components/admin/AdminHeader";
import { getAdminAccess } from "@/lib/admin-auth";
import { FEEDBACK_REASONS } from "@/lib/journey-feedback";
import { feedbackPeriod, feedbackTotals, type FeedbackSummary } from "@/lib/journey-feedback-admin";
import { formatRouteLabel } from "@/lib/route-names";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { loadJourneyQuality } from "@/lib/journey-quality-server";
import { qualitySignal, QUALITY_MESSAGES, QUALITY_REVIEW_ACTIONS } from "@/lib/journey-quality";

export const dynamic = "force-dynamic";

export default async function JourneyOpinionsPage({ searchParams }: {
  searchParams: Promise<{ desde?: string; hasta?: string }>;
}) {
  const [access, params] = await Promise.all([getAdminAccess(), searchParams]);
  if (access.status !== "admin") redirect("/admin");
  const supabase = createSupabaseAdminClient();
  if (!supabase) redirect("/admin/login");
  const period = feedbackPeriod(params.desde, params.hasta);
  const [{ data, error }, qualityGroups] = await Promise.all([
    supabase.rpc("journey_feedback_summary", { p_from: period.fromTimestamp, p_until: period.untilTimestamp }),
    loadJourneyQuality().catch(() => null),
  ]);
  const summary = (data ?? { groups: [], previous: { total: 0, positive: 0 } }) as FeedbackSummary;
  const totals = feedbackTotals(summary.groups);
  const positiveRate = totals.total ? Math.round(totals.positive / totals.total * 100) : null;
  const previousRate = summary.previous.total ? Math.round(summary.previous.positive / summary.previous.total * 100) : null;
  const delta = positiveRate !== null && previousRate !== null ? positiveRate - previousRate : null;
  const inputClass = "admin-field mt-1 w-full";

  return <main className="min-h-dvh bg-[var(--admin-bg)] text-[var(--brand-white)]">
    <AdminHeader email={access.email} active="feedback" />
    <div className="mx-auto max-w-[1500px] px-5 py-8 sm:px-8">
      <div className="grid gap-6 border-b border-white/10 pb-7 lg:grid-cols-[1fr_400px] lg:items-end">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-[var(--brand-lime)]">La experiencia del viaje</p>
          <h1 className="mt-2 text-4xl font-bold sm:text-5xl">Opiniones de viajes</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--admin-muted)]">Identifica rutas y transbordos que necesitan revisión. Las opiniones orientan las comprobaciones del equipo.</p>
        </div>
        <form className="admin-card grid grid-cols-[repeat(2,minmax(0,1fr))] gap-2 p-3">
          <label className="text-xs font-bold text-[var(--admin-muted)]">Desde<input type="date" name="desde" defaultValue={period.from} required className={inputClass} /></label>
          <label className="text-xs font-bold text-[var(--admin-muted)]">Hasta<input type="date" name="hasta" defaultValue={period.to} required className={inputClass} /></label>
          <button className="admin-button admin-primary col-span-2 min-h-11 px-4 text-sm font-bold">Aplicar fechas</button>
          <p className="col-span-2 text-xs text-[var(--admin-muted)]">Hora de Uruapan · Hasta un año por consulta.</p>
        </form>
      </div>
      {error ? <p role="alert" className="my-6 rounded-lg border border-amber-300/30 p-5 text-sm text-amber-200">No se pudieron cargar las opiniones. Comprueba la conexión y que la migración de opiniones esté aplicada en Supabase.</p> : <>
        <section aria-label="Resumen de opiniones" className="mt-4 grid grid-cols-3 gap-2">
          {[["Recibidas", totals.total], ["Positivas", positiveRate === null ? "—" : `${positiveRate}%`], ["Negativas", totals.negative]].map(([label, value]) => <div key={label} className="admin-card px-2.5 py-3 sm:p-4"><p className="text-xs text-[var(--admin-muted)]">{label}</p><strong className="mt-1 block text-2xl font-bold tabular-nums sm:text-4xl">{value}</strong></div>)}
        </section>
        <p className="my-4 text-sm text-[var(--admin-muted)]">{delta === null ? "La comparación aparecerá cuando ambos periodos tengan opiniones." : `${delta > 0 ? "+" : ""}${delta} puntos porcentuales frente al periodo anterior (${summary.previous.total} opiniones).`}</p>
        <section aria-label="Señales que usa el planificador" className="admin-card mb-7 p-4">
          <h2 className="text-lg font-bold">Señales del planificador · últimos 30 días</h2>
          <details className="mt-2 text-sm text-[var(--admin-muted)]">
            <summary className="cursor-pointer font-semibold">Cómo se aplican las opiniones</summary>
            <p className="mt-2 leading-6">El planificador usa los últimos 30 días. Requiere al menos 20 dispositivos, opiniones en 3 días, 60% negativas y 5 con el mismo motivo. Cuenta la última opinión de cada dispositivo por combinación. Aplica hasta 2 puntos de ajuste en Menos caminata y Equilibrada.</p>
          </details>
          {qualityGroups === null ? <p className="mt-3 text-sm text-amber-200">No se pudieron consultar las señales. El planificador seguirá usando tiempos y caminatas sin ajustes por opiniones.</p> : qualityGroups.length === 0 ? <p className="mt-3 text-sm text-[var(--admin-muted)]">Aún no hay opiniones suficientes para calibrar las recomendaciones.</p> : <ul className="mt-4 space-y-4">{qualityGroups.map((group) => {
            const signal = qualitySignal(group);
            return <li key={group.route_keys.join("|")} className="border-t border-white/10 pt-3 text-sm">
              <p className="font-bold">{group.route_names.map((name) => formatRouteLabel(name)).join(" → ")}</p>
              <p className="mt-1 text-[var(--admin-muted)]">{group.devices} dispositivos · {group.negative} opiniones negativas · {group.active_days} días con opiniones.</p>
              <p className="mt-1 text-[var(--brand-lime)]">{signal ? `${QUALITY_MESSAGES[signal.concern]} Ajuste: ${signal.penalty.toFixed(1)} puntos.` : "Sin ajuste: todavía no alcanza los umbrales de evidencia."}</p>
              {signal && <p className="mt-1 text-[var(--admin-muted)]">{QUALITY_REVIEW_ACTIONS[signal.concern]}</p>}
            </li>;
          })}</ul>}
        </section>
        <h2 className="mb-4 text-xl font-bold">Rutas y transbordos por revisar</h2>
        {summary.groups.length === 0 ? <div className="rounded-xl border border-dashed border-white/15 px-6 py-14 text-center"><p className="font-serif text-2xl">Aún no hay opiniones en estas fechas.</p><p className="mt-3 text-sm text-[var(--admin-muted)]">Aquí aparecerán las nuevas respuestas enviadas desde el mapa.</p></div> : <div className="space-y-4">
          {summary.groups.map((group) => {
            const percent = Math.round(group.positive / group.total * 100);
            return <article key={group.route_keys.join("|")} className="admin-card grid gap-4 p-4 md:grid-cols-[minmax(0,1fr)_270px]">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-[var(--brand-lime)]">{group.route_keys.length === 2 ? "Transbordo" : "Ruta directa"}</p>
                <h3 className="mt-2 text-lg font-bold">{group.route_names.map((name) => formatRouteLabel(name)).join(" → ")}</h3>
                <p className="mt-2 text-sm text-[var(--admin-muted)]">{group.total} opiniones · {group.positive} Sí · {group.negative} No{group.total < 5 ? " · Muestra pequeña" : ""}</p>
                <div className="mt-3 flex flex-wrap gap-3">{group.route_names.map((name, index) => <Link key={group.route_keys[index]} href={`/admin/routes?buscar=${encodeURIComponent(name)}`} className="inline-flex min-h-11 items-center text-xs font-bold text-[var(--brand-lime)] underline underline-offset-4">Revisar {formatRouteLabel(name)}</Link>)}</div>
              </div>
              <div>
                <p className="text-sm font-semibold">{percent}% de respuestas positivas</p>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10" aria-hidden="true"><div className="h-full bg-[#b8e840]" style={{ width: `${percent}%` }} /></div>
                <ul className="mt-4 space-y-1 text-xs leading-5 text-[var(--admin-muted)]">{Object.entries(FEEDBACK_REASONS).map(([key, label]) => {
                  const count = group[key as keyof typeof FEEDBACK_REASONS] ?? 0;
                  return count > 0 ? <li key={key}>{label}: <strong>{count}</strong></li> : null;
                })}{group.unspecified > 0 && <li>Sin motivo: <strong>{group.unspecified}</strong></li>}</ul>
              </div>
            </article>;
          })}
        </div>}
      </>}
      <p className="mt-8 border-t border-white/10 pt-4 text-xs leading-6 text-[var(--admin-muted)]">Una opinión por dispositivo y ruta o combinación al día. No se guardan coordenadas en las opiniones. Los reportes detallados se consultan en la bandeja de Reportes.</p>
    </div>
  </main>;
}
