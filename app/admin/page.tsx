import { AlertCircle, ArrowRight, ExternalLink, PencilLine, Search, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminStatusNav from "@/components/admin/AdminStatusNav";
import AdminPagination from "@/components/admin/AdminPagination";
import AdminSubmitButton from "@/components/admin/AdminSubmitButton";
import ReportResolution from "@/components/admin/ReportResolution";
import { REPORT_LABELS, REPORT_PAGE_SIZE, isAgedReport, parseReportFilters, reportSearchExpression, reportsHref, type ReportFilterParams } from "@/lib/admin-report-filters";
import { getAdminPendingCounts } from "@/lib/admin-workload";
import ContributorHistory from "@/components/admin/ContributorHistory";
import ReportPathComparison from "@/components/admin/ReportPathComparison";
import { getAdminAccess } from "@/lib/admin-auth";
import { getReportRouteEditorHref } from "@/lib/admin-route";
import { getContributorReputations } from "@/lib/community-reputation";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { reviewCommunityReport, signOutAdmin } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

type ReportStatus = "pending" | "reviewing" | "approved" | "rejected" | "resolved";

type CommunityReportRow = {
  id: string;
  api_client_id: string | null;
  route_id: number | null;
  route_key: string | null;
  report_type: string;
  route_name: string | null;
  place: string | null;
  description: string;
  expected_result: string | null;
  contact: string | null;
  evidence_url: string | null;
  proposed_path: unknown;
  source_path: string | null;
  submission_source: "web" | "external_api";
  submitted_by_hash: string | null;
  status: ReportStatus;
  moderator_note: string | null;
  created_at: string;
  resolution_note?: string | null;
  resolved_at?: string | null;
  resolved_by?: string | null;
};

const filters: ReadonlyArray<{ value: ReportStatus; label: string }> = [
  { value: "pending", label: "Pendientes" },
  { value: "reviewing", label: "En revisión" },
  { value: "approved", label: "Aprobados" },
  { value: "resolved", label: "Resueltos" },
  { value: "rejected", label: "Descartados" },
];

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Mexico_City" }).format(new Date(value));
}

function isMissingCommunityApiSchema(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === "42703"
    || error.code === "PGRST204"
    || error.message?.includes("community_api_clients") === true
    || error.message?.includes("api_client_id") === true
    || error.message?.includes("submission_source") === true;
}

type Props = { searchParams: Promise<ReportFilterParams> };

export default async function AdminPage({ searchParams }: Props) {
  const [access, params] = await Promise.all([getAdminAccess(), searchParams]);
  if (access.status === "anonymous") redirect("/admin/login");
  if (access.status === "unconfigured") redirect("/admin/login");

  if (access.status === "denied") {
    return (
      <main className="grid min-h-dvh place-items-center bg-[var(--admin-bg)] px-5 text-[var(--brand-white)]">
        <section className="max-w-lg border border-[#f4c84a]/30 bg-[var(--admin-surface)] p-8">
          <ShieldCheck className="h-8 w-8 text-[#f4c84a]" aria-hidden="true" />
          <h1 className="mt-6 font-serif text-3xl font-black">Acceso no autorizado.</h1>
          <p className="mt-3 text-sm leading-7 text-[var(--admin-muted)]">Agrega {access.email ?? "este correo"} a <code className="text-[var(--brand-white)]">ADMIN_EMAILS</code> o a la tabla de administradores.</p>
          <form action={signOutAdmin}><button className="mt-6 h-11 bg-[#6aab48] px-5 text-sm font-black text-[#0c110a]">Cerrar sesión</button></form>
        </section>
      </main>
    );
  }

  const selectedFilters = parseReportFilters(params);
  const { status, search, type, page, oldest, reportId } = selectedFilters;
  const supabase = createSupabaseAdminClient();
  if (!supabase) redirect("/admin/login");

  const loadReports = (columns: string) => {
    let query = supabase.from("community_reports").select(columns, { count: "exact" }).eq("status", status === "resolved" ? "approved" : status);
    if (status === "resolved") query = query.not("resolved_at", "is", null);
    else if (status === "approved") query = query.is("resolved_at", null);
    if (search) query = query.or(reportSearchExpression(search));
    if (type) query = query.eq("report_type", type);
    if (reportId) query = query.eq("id", reportId);
    return query.order("created_at", { ascending: oldest }).order("id", { ascending: oldest })
      .range((page - 1) * REPORT_PAGE_SIZE, page * REPORT_PAGE_SIZE - 1);
  };
  const countRequests = filters.map((filter) => filter.value === "pending"
    ? getAdminPendingCounts().then((counts) => ({ count: counts.reports }))
    : (() => { const query = supabase.from("community_reports").select("id", { count: "exact", head: true }).eq("status", filter.value === "resolved" ? "approved" : filter.value);
      return filter.value === "resolved" ? query.not("resolved_at", "is", null) : filter.value === "approved" ? query.is("resolved_at", null) : query; })());
  const [counts, initialReportResult] = await Promise.all([
    Promise.all(countRequests),
    loadReports("id,api_client_id,route_id,route_key,report_type,route_name,place,description,expected_result,contact,evidence_url,proposed_path,source_path,submission_source,submitted_by_hash,status,moderator_note,created_at,resolution_note,resolved_at,resolved_by"),
  ]);
  let reportError = initialReportResult.error;
  let reports = (initialReportResult.data ?? []) as unknown as CommunityReportRow[];
  let totalReports = initialReportResult.count ?? 0;

  // Keep moderation available while the API migration is being rolled out.
  if (isMissingCommunityApiSchema(initialReportResult.error)) {
    const legacyResult = await loadReports("id,route_id,route_key,report_type,route_name,place,description,expected_result,contact,evidence_url,proposed_path,source_path,submitted_by_hash,status,moderator_note,created_at");

    reportError = legacyResult.error;
    totalReports = legacyResult.count ?? 0;
    reports = ((legacyResult.data ?? []) as unknown as CommunityReportRow[]).map((report) => ({
      ...report,
      api_client_id: null,
      submission_source: "web" as const,
    })) as unknown as CommunityReportRow[];
  }
  if (!reportError && page > Math.max(1, Math.ceil(totalReports / REPORT_PAGE_SIZE))) {
    redirect(reportsHref(selectedFilters, { page: Math.max(1, Math.ceil(totalReports / REPORT_PAGE_SIZE)) }));
  }
  const apiClientIds = [...new Set(reports.map((report) => report.api_client_id).filter((id): id is string => Boolean(id)))];
  const [contributorHistory, apiClientResult, publicationsResult] = await Promise.all([
    getContributorReputations(reports.map((report) => report.submitted_by_hash)),
    apiClientIds.length > 0
      ? supabase.from("community_api_clients").select("id,name").in("id", apiClientIds)
      : Promise.resolve({ data: [], error: null }),
    reports.length ? supabase.from("route_revisions").select("report_id,route_id,version,published_at")
      .in("report_id", reports.map((report) => report.id)).not("published_at", "is", null)
      .order("published_at", { ascending: false }).limit(500)
      : Promise.resolve({ data: [], error: null }),
  ]);
  const apiClientNames = new Map((apiClientResult.data ?? []).map((client) => [client.id, client.name]));
  const publications = new Map<string, { route_id: number; version: number }>();
  for (const revision of publicationsResult.data ?? []) {
    if (revision.report_id && !publications.has(revision.report_id)) publications.set(revision.report_id, revision);
  }

  return (
    <main className="min-h-dvh bg-[var(--admin-bg)] text-[var(--brand-white)]">
      <AdminHeader email={access.email} active="reports" />

      <div className="mx-auto max-w-[1500px] px-5 py-8 sm:px-8 lg:py-10">
        <div className="flex flex-col gap-4 pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[.16em] text-[var(--brand-lime)]">Bandeja comunitaria</p>
            <h1 className="mt-1 text-4xl font-bold sm:text-5xl">Reportes</h1>
            <p className="mt-2 text-sm text-[var(--admin-muted)]">Revisa avisos de la comunidad y abre la ruta si necesita una corrección.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/routes" className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[var(--brand-lime)] px-4 text-xs font-bold text-[var(--brand-deep)]"><PencilLine className="h-4 w-4" aria-hidden="true" /> Editar rutas</Link>
            <Link href="/reportar-error" target="_blank" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[var(--admin-line)] px-4 text-xs font-bold text-[var(--admin-muted)] hover:text-[var(--brand-white)]">Ver formulario <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /></Link>
          </div>
        </div>

        <section className="admin-workload mb-6" aria-label="Trabajo pendiente">
          <div><span>Por revisar</span><strong>{counts[0].count ?? "—"}</strong></div>
          <div><span>En seguimiento</span><strong>{counts[1].count ?? "—"}</strong></div>
          <p>Revisa el aviso, comprueba el sentido y publica la corrección desde el editor. Cada publicación conserva su historial.</p>
        </section>
        <AdminStatusNav label="Filtrar reportes por estado" items={filters.map((filter, index) => ({
          href: reportsHref(selectedFilters, { status: filter.value, page: 1, reportId: undefined }), label: filter.label, selected: status === filter.value, count: counts[index].count,
        }))} />

        <form className="admin-filterbar mt-4" aria-label="Buscar y filtrar reportes">
          <input type="hidden" name="estado" value={status} />
          {reportId && <input type="hidden" name="reporte" value={reportId} />}
          <label className="min-w-0 text-xs font-semibold text-[var(--admin-muted)]">Buscar por ruta, lugar o descripción
            <input name="buscar" defaultValue={search} maxLength={120} placeholder="Ej. Ruta 26, Centro, cambio de recorrido" className="admin-field mt-1 w-full" />
          </label>
          <label className="text-xs font-semibold text-[var(--admin-muted)]">Tipo de aviso
            <select aria-label="Tipo de aviso" name="tipo" defaultValue={type} className="admin-field mt-1 w-full"><option value="">Todos los tipos</option>{Object.entries(REPORT_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
          </label>
          <label className="text-xs font-semibold text-[var(--admin-muted)]">Orden
            <select aria-label="Orden" name="orden" defaultValue={oldest ? "antiguos" : "recientes"} className="admin-field mt-1 w-full"><option value="antiguos">Más antiguos primero</option><option value="recientes">Más recientes primero</option></select>
          </label>
          <button className="admin-button admin-primary min-h-11 px-4 text-sm font-bold">Aplicar filtros</button>
          {(search || type || reportId) && <Link href={reportsHref(selectedFilters, { search: "", type: "", page: 1, reportId: undefined })} className="inline-flex min-h-11 items-center text-xs font-semibold text-[var(--brand-lime)] underline">{reportId ? "Ver todos los reportes" : "Limpiar filtros"}</Link>}
        </form>

        <section className="py-6" aria-labelledby="reports-title">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-2"><h2 id="reports-title" className="text-sm font-black uppercase text-[var(--admin-muted)]">{filters.find((filter) => filter.value === status)?.label}</h2><span className="text-xs text-[var(--admin-muted)]">{reportError ? "—" : totalReports} resultados · {REPORT_PAGE_SIZE} por página</span></div>

          {reportError ? (
            <p role="alert" className="admin-card px-4 py-4 text-sm text-[#f4df98]">No se pudo cargar la bandeja. Vuelve a intentarlo conservando los filtros.</p>
          ) : reports.length === 0 ? (
            <div className="grid min-h-56 place-items-center border border-dashed border-white/10 text-center"><div><Search className="mx-auto h-7 w-7 text-[var(--admin-muted)]" /><p className="mt-4 font-serif text-2xl font-black">Nada por aquí.</p><p className="mt-2 text-sm text-[var(--admin-muted)]">No hay reportes en este estado.</p></div></div>
          ) : (
            <div className="space-y-3">
              {reports.map((report) => (
                <article key={report.id} id={`reporte-${report.id}`} className="grid min-w-0 gap-5 rounded-2xl border border-[var(--admin-line)] bg-[var(--admin-surface)] p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_300px]">
                  <div className="min-w-0 [overflow-wrap:anywhere]">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs font-black uppercase text-[var(--brand-lime)]">{REPORT_LABELS[report.report_type] ?? report.report_type}</p>
                      {(status === "pending" || status === "reviewing") && isAgedReport(report.created_at) && <span className="admin-badge admin-badge-warning">Más de 7 días pendiente</span>}
                      {publications.get(report.id) && <Link href={`/admin/routes/${publications.get(report.id)!.route_id}#historial`} className="admin-badge admin-badge-success">Corrección publicada · v{publications.get(report.id)!.version}</Link>}
                    </div>
                    <h3 className="mt-1 text-lg font-bold text-[var(--brand-white)]">{report.route_name || "Sin ruta indicada"}</h3>
                    <p className="mt-1 text-xs leading-5 text-[var(--admin-muted)]">
                      {report.place && <>{report.place} · </>}
                      <time dateTime={report.created_at}>{formatDate(report.created_at)}</time>
                    </p>
                    <p className="mt-3 whitespace-pre-line text-sm leading-6 text-[var(--brand-white)]">{report.description}</p>
                    {report.expected_result && <div className="mt-4 border-l-2 border-[#6aab48] pl-4"><p className="text-[10px] font-black uppercase text-[var(--admin-muted)]">Debería mostrar</p><p className="mt-1 text-sm leading-6 text-[var(--admin-muted)]">{report.expected_result}</p></div>}
                    <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[var(--admin-muted)]">
                      {report.submission_source === "external_api" && (
                        <span className="font-bold text-[#57d6e8]">
                          API: {report.api_client_id ? apiClientNames.get(report.api_client_id) ?? "integración revocada" : "integración eliminada"}
                        </span>
                      )}
                      {report.source_path && <Link href={report.source_path} target="_blank" className="hover:text-[var(--brand-lime)]">Abrir página relacionada</Link>}
                      {report.route_key && <Link href={`/ruta/${report.route_key}`} target="_blank" className="hover:text-[var(--brand-lime)]">Ver ficha de la ruta</Link>}
                      {report.evidence_url?.startsWith("https://") && <a href={report.evidence_url} target="_blank" rel="noreferrer" className="font-bold text-[#f4c84a] hover:underline">Abrir evidencia</a>}
                      {report.contact && <details><summary className="cursor-pointer font-semibold">Ver contacto</summary><p className="mt-2">{report.contact}</p></details>}
                    </div>
                    {report.route_key && Array.isArray(report.proposed_path) && (
                      <ReportPathComparison routeKey={report.route_key} proposedPath={report.proposed_path} />
                    )}
                    <ContributorHistory reputation={report.submitted_by_hash ? contributorHistory.get(report.submitted_by_hash) ?? null : null} />
                  </div>

                  <div className="min-w-0 space-y-3 border-t border-[var(--admin-line)] pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
                  {!report.resolved_at && <form action={reviewCommunityReport} className="space-y-3">
                    <input type="hidden" name="reportId" value={report.id} />
                    <label className="block"><span className="text-xs font-bold text-[var(--admin-muted)]">Nota interna</span><textarea name="note" maxLength={1000} defaultValue={report.moderator_note ?? ""} rows={2} placeholder="Qué se comprobó" className="mt-1 w-full border border-[var(--admin-line)] bg-[var(--brand-header)] px-3 py-2 text-sm text-[var(--brand-white)] placeholder:text-[var(--admin-muted)] focus:border-[var(--brand-lime)]" /></label>
                    <div className="flex flex-wrap gap-1.5 text-xs font-semibold">
                      <AdminSubmitButton name="status" value="reviewing" title="Marcar en revisión" className="admin-button min-h-11 px-2.5">{report.status === "reviewing" ? "Guardar nota" : "En revisión"}</AdminSubmitButton>
                      <AdminSubmitButton name="status" value="approved" className="admin-button min-h-11 px-2.5">{report.status === "approved" ? "Guardar nota" : "Aprobar"}</AdminSubmitButton>
                      {report.status !== "rejected" ? <details className="basis-full rounded-lg border border-[var(--admin-line)] px-3 py-2">
                        <summary className="min-h-9 cursor-pointer py-2 text-[#f2b7af]">Descartar reporte</summary>
                        <p className="my-2 text-xs leading-5 text-[var(--admin-muted)]">Puedes anotar el motivo en la nota interna antes de confirmar.</p>
                        <AdminSubmitButton name="status" value="rejected" className="admin-button min-h-11 px-3 text-[#f2b7af]">Confirmar descarte</AdminSubmitButton>
                      </details> : <AdminSubmitButton name="status" value="rejected" className="admin-button min-h-11 px-3">Guardar nota</AdminSubmitButton>}
                    </div>
                    {report.status === "approved" ? (
                      <Link href={getReportRouteEditorHref(report)} className="flex min-h-11 items-center justify-between gap-2 rounded-lg bg-[var(--brand-lime)] px-3 text-sm font-bold text-[var(--brand-deep)]">
                        Editar ruta <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </Link>
                    ) : report.status !== "rejected" && (report.route_id || report.route_key || report.route_name) ? (
                      <AdminSubmitButton name="status" value="approve_edit" className="flex min-h-11 w-full items-center justify-between gap-2 rounded-lg bg-[var(--brand-lime)] px-3 text-left text-sm font-bold text-[var(--brand-deep)]">
                        Aprobar y editar ruta <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </AdminSubmitButton>
                    ) : null}
                  </form>}
                  <ReportResolution id={report.id} note={report.resolution_note} at={report.resolved_at} by={report.resolved_by} />
                  </div>
                </article>
              ))}
            </div>
          )}
          {publicationsResult.error && <p className="mt-3 text-xs text-amber-200">No se pudo comprobar qué reportes tienen una publicación asociada.</p>}
          {!reportError && <AdminPagination page={page} total={totalReports} pageSize={REPORT_PAGE_SIZE} href={(page) => reportsHref(selectedFilters, { page })} />}
        </section>

        <aside className="mt-4 flex gap-3 border-t border-[var(--admin-line)] pt-5 text-xs leading-5 text-[var(--admin-muted)]"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand-lime)]" /><p>Aprobar un reporte reconoce que la información es válida; publicar una nueva geometría será un paso separado y versionado.</p></aside>
      </div>
    </main>
  );
}
