import Link from "next/link";
import { redirect } from "next/navigation";
import AdminHeader from "@/components/admin/AdminHeader";
import { getAdminAccess } from "@/lib/admin-auth";
import { FEEDBACK_REASONS } from "@/lib/journey-feedback";
import { feedbackPeriod, feedbackTotals, type FeedbackSummary } from "@/lib/journey-feedback-admin";
import { formatRouteLabel } from "@/lib/route-names";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function JourneyOpinionsPage({ searchParams }: {
  searchParams: Promise<{ desde?: string; hasta?: string }>;
}) {
  const [access, params] = await Promise.all([getAdminAccess(), searchParams]);
  if (access.status !== "admin") redirect("/admin");
  const supabase = createSupabaseAdminClient();
  if (!supabase) redirect("/admin/login");
  const period = feedbackPeriod(params.desde, params.hasta);
  const { data, error } = await supabase.rpc("journey_feedback_summary", { p_from: period.fromTimestamp, p_until: period.untilTimestamp });
  const summary = (data ?? { groups: [], previous: { total: 0, positive: 0 } }) as FeedbackSummary;
  const totals = feedbackTotals(summary.groups);
  const positiveRate = totals.total ? Math.round(totals.positive / totals.total * 100) : null;
  const previousRate = summary.previous.total ? Math.round(summary.previous.positive / summary.previous.total * 100) : null;
  const delta = positiveRate !== null && previousRate !== null ? positiveRate - previousRate : null;
  const inputClass = "mt-2 min-h-11 w-full rounded-lg border border-white/15 bg-[#090d08] px-3 text-sm text-[#e8f2d8] [color-scheme:dark] focus:outline focus:outline-2 focus:outline-[#b8e840]";

  return <main className="min-h-dvh bg-[#0c110a] text-[#e8f2d8]">
    <AdminHeader email={access.email} active="feedback" />
    <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
      <div className="grid gap-6 border-b border-white/10 pb-7 lg:grid-cols-[1fr_400px] lg:items-end">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-[#b8e840]">La experiencia del viaje</p>
          <h1 className="mt-3 font-serif text-4xl font-black sm:text-5xl">Opiniones de viajes</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-[#a8c888]">Identifica rutas y transbordos que necesitan revisión. Las opiniones orientan las comprobaciones del equipo.</p>
        </div>
        <form className="grid grid-cols-2 gap-3">
          <label className="text-xs font-bold text-[#a8c888]">Desde<input type="date" name="desde" defaultValue={period.from} required className={inputClass} /></label>
          <label className="text-xs font-bold text-[#a8c888]">Hasta<input type="date" name="hasta" defaultValue={period.to} required className={inputClass} /></label>
          <button className="col-span-2 min-h-11 rounded-lg bg-[#b8e840] px-4 text-sm font-bold text-[#0c110a]">Aplicar fechas</button>
          <p className="col-span-2 text-xs text-[#89a873]">Hora de Uruapan · Hasta un año por consulta.</p>
        </form>
      </div>
      {error ? <p role="alert" className="my-6 rounded-lg border border-amber-300/30 p-5 text-sm text-amber-200">No se pudieron cargar las opiniones. Comprueba la conexión y que la migración de opiniones esté aplicada en Supabase.</p> : <>
        <section aria-label="Resumen de opiniones" className="grid grid-cols-1 divide-y divide-white/10 border-b border-white/10 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {[["Opiniones recibidas", totals.total], ["Respuestas positivas", positiveRate === null ? "—" : `${positiveRate}%`], ["Respuestas negativas", totals.negative]].map(([label, value]) => <div key={label} className="px-4 py-6"><p className="text-sm text-[#a8c888]">{label}</p><strong className="mt-2 block font-serif text-5xl tabular-nums">{value}</strong></div>)}
        </section>
        <p className="my-4 text-sm text-[#a8c888]">{delta === null ? "La comparación aparecerá cuando ambos periodos tengan opiniones." : `${delta > 0 ? "+" : ""}${delta} puntos porcentuales frente al periodo anterior (${summary.previous.total} opiniones).`}</p>
        <div className="mb-6 rounded-lg border-l-2 border-[#b8e840] bg-[#b8e840]/5 p-4 text-sm leading-6 text-[#a8c888]">Revisa primero las combinaciones con más respuestas negativas. Considera siempre cuántas personas respondieron: menos de 5 opiniones se señala como muestra pequeña. Estos datos no cambian automáticamente las recomendaciones.</div>
        <h2 className="mb-4 font-serif text-2xl font-bold">Rutas y transbordos por revisar</h2>
        {summary.groups.length === 0 ? <div className="rounded-xl border border-dashed border-white/15 px-6 py-14 text-center"><p className="font-serif text-2xl">Aún no hay opiniones en estas fechas.</p><p className="mt-3 text-sm text-[#a8c888]">Aquí aparecerán las nuevas respuestas enviadas desde el mapa.</p></div> : <div className="space-y-4">
          {summary.groups.map((group) => {
            const percent = Math.round(group.positive / group.total * 100);
            return <article key={group.route_keys.join("|")} className="grid gap-5 rounded-xl border border-white/10 bg-[#10190d] p-5 md:grid-cols-[1fr_270px]">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-[#b8e840]">{group.route_keys.length === 2 ? "Transbordo" : "Ruta directa"}</p>
                <h3 className="mt-2 text-lg font-bold">{group.route_names.map((name) => formatRouteLabel(name)).join(" → ")}</h3>
                <p className="mt-2 text-sm text-[#a8c888]">{group.total} opiniones · {group.positive} Sí · {group.negative} No{group.total < 5 ? " · Muestra pequeña" : ""}</p>
                <div className="mt-3 flex flex-wrap gap-3">{group.route_names.map((name, index) => <Link key={group.route_keys[index]} href={`/admin/routes?buscar=${encodeURIComponent(name)}`} className="inline-flex min-h-11 items-center text-xs font-bold text-[#b8e840] underline underline-offset-4">Revisar {formatRouteLabel(name)}</Link>)}</div>
              </div>
              <div>
                <p className="text-sm font-semibold">{percent}% de respuestas positivas</p>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10" aria-hidden="true"><div className="h-full bg-[#b8e840]" style={{ width: `${percent}%` }} /></div>
                <ul className="mt-4 space-y-1 text-xs leading-5 text-[#a8c888]">{Object.entries(FEEDBACK_REASONS).map(([key, label]) => {
                  const count = group[key as keyof typeof FEEDBACK_REASONS];
                  return count > 0 ? <li key={key}>{label}: <strong>{count}</strong></li> : null;
                })}{group.unspecified > 0 && <li>Sin motivo: <strong>{group.unspecified}</strong></li>}</ul>
              </div>
            </article>;
          })}
        </div>}
      </>}
      <p className="mt-8 border-t border-white/10 pt-4 text-xs leading-6 text-[#89a873]">Una opinión por dispositivo y ruta o combinación al día. No se guardan coordenadas en las opiniones. Los reportes detallados se consultan en la bandeja de Reportes.</p>
    </div>
  </main>;
}
