import { ArrowLeft, CheckCircle2, History, RotateCcw } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { restoreRouteRevision } from "@/app/admin/actions";
import AdminHeader from "@/components/admin/AdminHeader";
import RoutePathEditor from "@/components/admin/RoutePathEditor";
import RouteVerificationForm from "@/components/admin/RouteVerificationForm";
import { getAdminAccess } from "@/lib/admin-auth";
import type { RouteOperationalStatus } from "@/lib/admin-route";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ reporte?: string; publicada?: string; restaurada?: string; verificada?: string }>;
};

type RouteRow = {
  id: number;
  name: string;
  original_name: string;
  color: string;
  corridor_width_m: number;
  verified: boolean;
  path: unknown;
  operational_status: RouteOperationalStatus;
  data_version: number;
  last_verified_at: string | null;
};

type RevisionRow = {
  id: string;
  version: number;
  change_summary: string | null;
  source: string;
  created_at: string;
  published_at: string | null;
};

type FieldVerificationRow = {
  id: string;
  note: string;
  verified_at: string;
};

type ApprovedReport = { id: string; description: string; route_name: string | null; route_id: number | null; proposed_path: unknown };

function formatDate(value: string | null) {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Mexico_City" }).format(new Date(value));
}

export default async function AdminRoutePage({ params, searchParams }: Props) {
  const [access, routeParams, query] = await Promise.all([getAdminAccess(), params, searchParams]);
  if (access.status !== "admin") redirect("/admin");

  const routeId = Number(routeParams.id);
  if (!Number.isSafeInteger(routeId) || routeId <= 0) notFound();
  const supabase = createSupabaseAdminClient();
  if (!supabase) redirect("/admin/login");

  const [routeResult, revisionsResult, reportsByIdResult, verificationHistoryResult] = await Promise.all([
    supabase.from("routes").select("id,name,original_name,color,corridor_width_m,verified,path,operational_status,data_version,last_verified_at").eq("id", routeId).maybeSingle(),
    supabase.from("route_revisions").select("id,version,change_summary,source,created_at,published_at").eq("route_id", routeId).order("version", { ascending: false }).limit(25),
    query.reporte
      ? supabase.from("community_reports").select("id,description,route_name,route_id,proposed_path").eq("id", query.reporte).eq("status", "approved").maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase.from("route_field_verifications").select("id,note,verified_at").eq("route_id", routeId).order("verified_at", { ascending: false }).limit(10),
  ]);

  if (routeResult.error || !routeResult.data) notFound();
  const route = routeResult.data as RouteRow;
  const revisions = (revisionsResult.data ?? []) as RevisionRow[];
  const fieldVerifications = (verificationHistoryResult.data ?? []) as FieldVerificationRow[];
  const report = reportsByIdResult.data as ApprovedReport | null;
  const linkedReport = report && (report.route_id === null || report.route_id === route.id) ? report : null;

  return (
    <main className="min-h-dvh bg-[var(--admin-bg)] text-[var(--brand-white)]">
      <AdminHeader email={access.email} active="routes" />
      <div className="mx-auto max-w-[1500px] px-5 py-8 sm:px-8 lg:py-10">
        <Link href={linkedReport ? `/admin?estado=approved#reporte-${linkedReport.id}` : "/admin/routes"} className="inline-flex min-h-11 items-center gap-2 text-xs font-bold text-[var(--admin-muted)] transition hover:text-[var(--brand-lime)]"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> {linkedReport ? "Volver al reporte" : "Volver a rutas"}</Link>

        <div className="mt-6 flex flex-col gap-5 border-b border-[var(--admin-line)] pb-8 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase text-[var(--brand-lime)]">Ruta #{route.id} · versión {route.data_version}</p>
            <h1 className="mt-2 text-3xl font-bold sm:text-5xl">{route.name}</h1>
            <p className="mt-2 text-sm text-[var(--admin-muted)]">{route.original_name}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href="#verificacion" className="admin-button inline-flex min-h-11 items-center px-3 text-xs font-bold">Verificación</a>
            <a href="#historial" className="admin-button inline-flex min-h-11 items-center px-3 text-xs font-bold">Historial</a>
            <Link href={`/mapa?r=${encodeURIComponent(route.name)}`} target="_blank" className="admin-button inline-flex min-h-11 items-center px-3 text-xs font-bold">Mapa público</Link>
          </div>
        </div>

        {query.publicada && (
          <div className="mt-6 flex items-center gap-3 border-l-2 border-[#b8e840] bg-[#b8e840]/[0.06] px-4 py-3 text-sm text-[#c9dbb9]" role="status">
            <CheckCircle2 className="h-4 w-4 text-[var(--brand-lime)]" /> Versión {query.publicada} publicada{query.restaurada ? ` desde la versión ${query.restaurada}` : ""}.
          </div>
        )}

        {query.verificada && (
          <div className="mt-6 flex items-center gap-3 border-l-2 border-[#57d6e8] bg-[#57d6e8]/[0.06] px-4 py-3 text-sm text-[#c9eef3]" role="status">
            <CheckCircle2 className="h-4 w-4 text-[#57d6e8]" /> Verificación de campo registrada sin modificar el recorrido.
          </div>
        )}

        {linkedReport && (
          <section className="admin-card mt-5 p-4" aria-label="Reporte vinculado">
            <p className="text-xs font-bold text-[var(--brand-lime)]">Reporte aprobado{linkedReport.route_name ? ` · ${linkedReport.route_name}` : ""}</p>
            <p className="mt-2 whitespace-pre-line text-sm leading-6 text-[var(--admin-muted)] [overflow-wrap:anywhere]">{linkedReport.description}</p>
          </section>
        )}
        {query.reporte && !linkedReport ? (
          <p role="alert" className="admin-card mt-5 p-4 text-sm text-amber-200">
            Este reporte no está aprobado o ya se vinculó con otra ruta.{" "}
            <Link href={`/admin/routes/${route.id}`} className="font-bold underline">Editar esta ruta sin vincular un reporte</Link>
          </p>
        ) : (
          <section className="py-6" aria-labelledby="editor-heading">
            <h2 id="editor-heading" className="mb-3 text-xl font-bold">Editar ruta</h2>
            <RoutePathEditor
              key={`${route.id}:${route.data_version}:${linkedReport?.id ?? ""}`}
              route={{
                id: route.id,
                name: route.name,
                originalName: route.original_name,
                color: route.color,
                corridorWidthM: route.corridor_width_m,
                verified: route.verified,
                operationalStatus: route.operational_status,
                dataVersion: route.data_version,
                path: route.path,
              }}
              linkedReport={linkedReport ? { id: linkedReport.id, proposedPath: linkedReport.proposed_path } : null}
            />
          </section>
        )}

        <div id="verificacion" className="admin-card scroll-mt-4 p-4">
          <RouteVerificationForm
            routeId={route.id}
            dataVersion={route.data_version}
            lastVerifiedAt={route.last_verified_at}
          />
        </div>

        {verificationHistoryResult.error ? (
          <p className="border-b border-[var(--admin-line)] py-4 text-xs text-[#f4df98]">El historial estará disponible después de aplicar la migración de verificaciones.</p>
        ) : fieldVerifications.length > 0 ? (
          <section className="border-b border-[var(--admin-line)] py-6" aria-labelledby="verification-history-heading">
            <h2 id="verification-history-heading" className="text-xs font-black uppercase text-[var(--admin-muted)]">Comprobaciones recientes</h2>
            <ol className="mt-4 divide-y divide-white/[0.06]">
              {fieldVerifications.map((verification) => (
                <li key={verification.id} className="grid gap-2 py-3 text-sm sm:grid-cols-[170px_minmax(0,1fr)]">
                  <time dateTime={verification.verified_at} className="text-xs text-[#57d6e8]">{formatDate(verification.verified_at)}</time>
                  <p className="leading-6 text-[var(--admin-muted)]">{verification.note}</p>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        <section id="historial" className="mt-6 scroll-mt-4 border-t border-[var(--admin-line)] py-6" aria-labelledby="history-heading">
          <div className="mb-5 flex items-center gap-3"><History className="h-5 w-5 text-[var(--brand-lime)]" /><h2 id="history-heading" className="text-sm font-black uppercase text-[var(--admin-muted)]">Historial de publicaciones</h2></div>
          {revisionsResult.error ? (
            <p className="text-sm text-[#f4df98]">No se pudo cargar el historial.</p>
          ) : (
            <div className="divide-y divide-white/[0.08] border-y border-[var(--admin-line)]">
              {revisions.map((revision) => (
                <article key={revision.id} className="grid gap-4 py-5 md:grid-cols-[100px_minmax(0,1fr)_190px] md:items-center">
                  <div><strong className="font-serif text-2xl text-[var(--brand-white)]">v{revision.version}</strong>{revision.version === route.data_version && <span className="ml-2 text-[10px] font-black uppercase text-[var(--brand-lime)]">Actual</span>}</div>
                  <div><p className="text-sm leading-6 text-[#c9dbb9]">{revision.change_summary || "Sin resumen"}</p><p className="mt-1 text-[11px] text-[var(--admin-muted)]">{formatDate(revision.published_at ?? revision.created_at)} · {revision.source}</p></div>
                  {revision.version !== route.data_version && (
                    <details>
                      <summary className="admin-button min-h-11 cursor-pointer px-3 py-3 text-xs font-bold">Restaurar esta versión</summary>
                      <form action={restoreRouteRevision} className="mt-2 space-y-2">
                        <input type="hidden" name="routeId" value={route.id} />
                        <input type="hidden" name="expectedVersion" value={route.data_version} />
                        <input type="hidden" name="revisionId" value={revision.id} />
                        <p className="text-xs text-[var(--admin-muted)]">Se publicará la versión {revision.version} como una nueva revisión.</p>
                        <button className="admin-button inline-flex min-h-11 w-full items-center justify-center gap-2 px-3 text-xs font-bold"><RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Confirmar restauración</button>
                      </form>
                    </details>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

