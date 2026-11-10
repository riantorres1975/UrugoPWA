import { Activity, AlertTriangle, ArrowRight, CheckCircle2, Download, Search } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import AdminHeader from "@/components/admin/AdminHeader";
import { getAdminAccess } from "@/lib/admin-auth";
import { summarizeAdminRouteReview, type AdminRouteSignal } from "@/lib/admin-route-review";
import { getRouteKey } from "@/lib/route-names";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ buscar?: string; reporte?: string; vista?: string }> };

type RouteRow = {
  id: number;
  name: string;
  original_name: string;
  color: string;
  verified: boolean;
  operational_status: "active" | "under_review" | "inactive" | "historical";
  data_version: number;
  last_verified_at: string | null;
};

type ConfirmationRow = AdminRouteSignal & {
  route_name: string;
};

const statusLabels = {
  active: "Activa",
  under_review: "En revisión",
  inactive: "Inactiva",
  historical: "Histórica",
};

function formatVerifiedDate(value: string | null): string {
  if (!value) return "Sin fecha de verificación";
  return `Verificada ${new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeZone: "America/Mexico_City",
  }).format(new Date(value))}`;
}

export default async function AdminRoutesPage({ searchParams }: Props) {
  const [access, params] = await Promise.all([getAdminAccess(), searchParams]);
  if (access.status !== "admin") redirect("/admin");

  const supabase = createSupabaseAdminClient();
  if (!supabase) redirect("/admin/login");

  const [routeResult, confirmationResult] = await Promise.all([
    supabase.from("routes").select("id,name,original_name,color,verified,operational_status,data_version,last_verified_at").order("name").order("id"),
    supabase.from("route_confirmations").select("route_name,confirmation_type,status,observed_at,submitted_by_hash").order("observed_at", { ascending: false }).limit(5000),
  ]);

  const routes = (routeResult.data ?? []) as RouteRow[];
  const confirmations = (confirmationResult.data ?? []) as ConfirmationRow[];
  const query = params.buscar?.trim().toLocaleLowerCase("es-MX") ?? "";
  const attentionOnly = params.vista === "prioridad";

  const signals = new Map<string, ConfirmationRow[]>();
  for (const confirmation of confirmations) {
    const current = signals.get(confirmation.route_name) ?? [];
    current.push(confirmation);
    signals.set(confirmation.route_name, current);
  }

  const routeRows = routes.map((route) => ({
    route,
    review: summarizeAdminRouteReview(route, signals.get(route.name) ?? []),
  }));
  const attentionCount = routeRows.filter(({ review }) => review.needsAttention).length;
  const visibleRoutes = routeRows
    .filter(({ route, review }) => (!attentionOnly || review.needsAttention)
      && (!query || `${route.name} ${route.original_name} ${route.id} ${getRouteKey(route.name)}`.toLocaleLowerCase("es-MX").includes(query)))
    .sort((left, right) => right.review.priority - left.review.priority
      || left.route.name.localeCompare(right.route.name, "es-MX")
      || left.route.id - right.route.id);

  const listHref = (view: "prioridad" | "todas") => {
    const search = new URLSearchParams({ vista: view });
    if (query) search.set("buscar", params.buscar?.trim() ?? "");
    if (params.reporte) search.set("reporte", params.reporte);
    return `/admin/routes?${search}`;
  };

  return (
    <main className="min-h-dvh bg-[var(--admin-bg)] text-[var(--brand-white)]">
      <AdminHeader email={access.email} active="routes" />
      <div className="mx-auto max-w-[1500px] px-5 py-8 sm:px-8 lg:py-10">
        <div className="grid gap-6 border-b border-[var(--admin-line)] pb-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end">
          <div>
            <p className="text-xs font-black uppercase text-[var(--brand-lime)]">Inventario publicado</p>
            <h1 className="mt-2 text-4xl font-bold sm:text-5xl">{params.reporte ? "Elige la ruta del reporte" : "Editar rutas"}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--admin-muted)]">{params.reporte ? "Confirma el sentido del recorrido antes de abrir el editor." : "Busca una ruta y elige el sentido que quieres editar. Puedes restaurar versiones desde su historial."}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
            <form className="flex min-w-0 gap-2">
              {params.reporte && <input type="hidden" name="reporte" value={params.reporte} />}
              <input type="hidden" name="vista" value={attentionOnly ? "prioridad" : "todas"} />
              <label className="relative min-w-0 flex-1">
                <span className="sr-only">Buscar ruta</span>
                <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-[var(--admin-muted)]" aria-hidden="true" />
                <input name="buscar" defaultValue={params.buscar ?? ""} placeholder="Nombre o número" className="h-11 w-full border border-[var(--admin-line)] bg-[var(--brand-header)] pl-9 pr-2 text-sm text-[var(--brand-white)] placeholder:text-[var(--admin-muted)] focus:border-[var(--brand-lime)]" />
              </label>
              <button className="h-11 rounded-lg border border-[var(--admin-line)] px-2.5 text-xs font-bold hover:border-[var(--brand-lime)]">Buscar</button>
            </form>
            <a href="/api/admin/routes/export" download className="inline-flex h-11 items-center justify-center gap-2 border border-white/15 px-4 text-xs font-black text-[var(--admin-muted)] transition hover:border-[#6aab48]/60 hover:text-[var(--brand-white)]" title="Descargar rutas e historial en JSON">
              <Download className="h-4 w-4" aria-hidden="true" /> Respaldo
            </a>
          </div>
        </div>

        {routeResult.error ? (
          <p className="mt-8 border-l-2 border-[#f4c84a] px-4 py-3 text-sm text-[#f4df98]">No se pudo cargar el inventario: {routeResult.error.message}</p>
        ) : (
          <section className="mt-6" aria-label="Rutas administrables">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-4 border-b border-[var(--admin-line)] pb-4">
              <nav className="flex gap-1" aria-label="Filtrar inventario">
                <Link href={listHref("prioridad")} aria-current={attentionOnly ? "page" : undefined} className={`px-4 py-2 text-xs font-black transition ${attentionOnly ? "bg-[var(--brand-lime)] text-[#0c110a]" : "text-[var(--admin-muted)] hover:bg-white/[0.04] hover:text-[var(--brand-white)]"}`}>Por revisar <span className="ml-1 tabular-nums">{attentionCount}</span></Link>
                <Link href={listHref("todas")} aria-current={!attentionOnly ? "page" : undefined} className={`px-4 py-2 text-xs font-black transition ${!attentionOnly ? "bg-[var(--brand-lime)] text-[#0c110a]" : "text-[var(--admin-muted)] hover:bg-white/[0.04] hover:text-[var(--brand-white)]"}`}>Todas <span className="ml-1 tabular-nums">{routes.length}</span></Link>
              </nav>
              <span className="text-xs text-[var(--admin-muted)]">Alertas posteriores a la última verificación</span>
            </div>
            <div className="divide-y divide-white/[0.08] border-y border-[var(--admin-line)]">
              {visibleRoutes.map(({ route, review }) => {
                const href = `/admin/routes/${route.id}${params.reporte ? `?reporte=${encodeURIComponent(params.reporte)}` : ""}`;
                return (
                  <Link key={route.id} href={href} className="grid gap-3 px-2 py-4 transition hover:bg-white/[0.04] sm:grid-cols-[minmax(0,1fr)_100px_180px_68px] sm:items-center sm:px-4">
                    <div className="flex min-w-0 items-center gap-4">
                      <span className="h-9 w-2 shrink-0" style={{ backgroundColor: route.color }} aria-hidden="true" />
                      <div className="min-w-0"><strong className="block truncate text-sm text-[var(--brand-white)]">{route.name}</strong><span className="mt-1 block truncate text-xs text-[var(--admin-muted)]">#{route.id} · {route.original_name}</span><span className="mt-1 block text-[11px] text-[var(--admin-muted)]">{formatVerifiedDate(route.last_verified_at)}</span></div>
                    </div>
                    <div className="text-xs"><span className="text-[var(--admin-muted)]">Versión </span><strong className="text-[#c9dbb9]">{route.data_version}</strong></div>
                    <div className="flex flex-wrap gap-2 text-[11px] font-bold">
                      <span className={`px-2 py-1 ${route.operational_status === "active" ? "bg-[#6aab48]/10 text-[var(--admin-muted)]" : "bg-[#f4c84a]/10 text-[#f4df98]"}`}>{statusLabels[route.operational_status]}</span>
                      {review.acceptedConcern > 0 && <span className="inline-flex items-center gap-1 bg-[#dd6b5f]/10 px-2 py-1 text-[#e98b80]"><AlertTriangle className="h-3 w-3" /> {review.acceptedConcern} {review.acceptedConcern === 1 ? "alerta aceptada" : "alertas aceptadas"}</span>}
                      {review.pending > 0 && <span className="inline-flex items-center gap-1 bg-[#f4c84a]/10 px-2 py-1 text-[#f4df98]"><Activity className="h-3 w-3" /> {review.pending} por revisar</span>}
                      {review.staleVerification && <span className="inline-flex items-center gap-1 bg-[#f4c84a]/10 px-2 py-1 text-[#f4df98]"><Activity className="h-3 w-3" /> Verificación antigua</span>}
                      {review.acceptedSeen > 0 && <span className="inline-flex items-center gap-1 px-2 py-1 text-[var(--admin-muted)]"><CheckCircle2 className="h-3 w-3" /> {review.acceptedSeen} {review.acceptedSeen === 1 ? "vista reciente" : "vistas recientes"}</span>}
                      {!review.needsAttention && review.acceptedSeen === 0 && <span className="inline-flex items-center gap-1 px-2 py-1 text-[var(--admin-muted)]"><CheckCircle2 className="h-3 w-3" /> Sin alertas</span>}
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--brand-lime)]">Editar <ArrowRight className="h-4 w-4" aria-hidden="true" /></span>
                  </Link>
                );
              })}
            </div>
            {visibleRoutes.length === 0 && (
              <div className="space-y-3 py-10 text-center text-sm text-[var(--admin-muted)]">
                <p>{query ? "No encontramos una ruta con ese nombre." : attentionOnly ? "No hay rutas que requieran revisión." : "El inventario no tiene rutas."}</p>
                {(query || attentionOnly) && <Link href={params.reporte ? `/admin/routes?reporte=${encodeURIComponent(params.reporte)}` : "/admin/routes"} className="inline-flex min-h-11 items-center rounded-lg border border-[var(--admin-line)] px-4 font-bold text-[var(--brand-lime)]">Ver todas las rutas</Link>}
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
