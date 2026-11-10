import { AlertCircle, ArrowRight, ExternalLink, PencilLine, Search, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminStatusNav from "@/components/admin/AdminStatusNav";
import ContributorHistory from "@/components/admin/ContributorHistory";
import ReportPathComparison from "@/components/admin/ReportPathComparison";
import { getAdminAccess } from "@/lib/admin-auth";
import { getReportRouteEditorHref } from "@/lib/admin-route";
import { getContributorReputations } from "@/lib/community-reputation";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { reviewCommunityReport, signOutAdmin } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

type ReportStatus = "pending" | "reviewing" | "approved" | "rejected";

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
};

const filters: ReadonlyArray<{ value: ReportStatus; label: string }> = [
  { value: "pending", label: "Pendientes" },
  { value: "reviewing", label: "En revisión" },
  { value: "approved", label: "Aprobados" },
  { value: "rejected", label: "Descartados" },
];

const reportLabels: Record<string, string> = {
  route_incorrect: "Ruta incorrecta",
  route_missing: "Ruta faltante",
  route_inactive: "Posiblemente inactiva",
  route_changed: "Cambio de recorrido",
  schedule_changed: "Cambio de horario",
  landmark_changed: "Referencia incorrecta",
  map_error: "Error de mapa",
  location_problem: "Problema de ubicación",
  usability_problem: "Error de uso",
  other: "Otro",
};

function safeStatus(value: string | undefined): ReportStatus {
  return filters.some((filter) => filter.value === value) ? value as ReportStatus : "pending";
}

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

type Props = { searchParams: Promise<{ estado?: string }> };

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

  const status = safeStatus(params.estado);
  const supabase = createSupabaseAdminClient();
  if (!supabase) redirect("/admin/login");

  const countRequests = filters.map((filter) => supabase.from("community_reports").select("id", { count: "exact", head: true }).eq("status", filter.value));
  const [counts, initialReportResult] = await Promise.all([
    Promise.all(countRequests),
    supabase
      .from("community_reports")
      .select("id,api_client_id,route_id,route_key,report_type,route_name,place,description,expected_result,contact,evidence_url,proposed_path,source_path,submission_source,submitted_by_hash,status,moderator_note,created_at")
      .eq("status", status)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);
  let reportError = initialReportResult.error;
  let reports = (initialReportResult.data ?? []) as CommunityReportRow[];

  // Keep moderation available while the API migration is being rolled out.
  if (isMissingCommunityApiSchema(initialReportResult.error)) {
    const legacyResult = await supabase
      .from("community_reports")
      .select("id,route_id,route_key,report_type,route_name,place,description,expected_result,contact,evidence_url,proposed_path,source_path,submitted_by_hash,status,moderator_note,created_at")
      .eq("status", status)
      .order("created_at", { ascending: false })
      .limit(50);

    reportError = legacyResult.error;
    reports = (legacyResult.data ?? []).map((report) => ({
      ...report,
      api_client_id: null,
      submission_source: "web" as const,
    })) as CommunityReportRow[];
  }
  const apiClientIds = [...new Set(reports.map((report) => report.api_client_id).filter((id): id is string => Boolean(id)))];
  const [contributorHistory, apiClientResult] = await Promise.all([
    getContributorReputations(reports.map((report) => report.submitted_by_hash)),
    apiClientIds.length > 0
      ? supabase.from("community_api_clients").select("id,name").in("id", apiClientIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  const apiClientNames = new Map((apiClientResult.data ?? []).map((client) => [client.id, client.name]));

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

        <AdminStatusNav label="Filtrar reportes por estado" items={filters.map((filter, index) => ({
          href: `/admin?estado=${filter.value}`, label: filter.label, selected: status === filter.value, count: counts[index].count,
        }))} />

        <section className="py-6" aria-labelledby="reports-title">
          <div className="mb-5 flex items-center justify-between"><h2 id="reports-title" className="text-sm font-black uppercase text-[var(--admin-muted)]">{filters.find((filter) => filter.value === status)?.label}</h2><span className="text-xs text-[var(--admin-muted)]">Máximo 50 por vista</span></div>

          {reportError ? (
            <p className="border-l-2 border-[#f4c84a] px-4 py-3 text-sm text-[#f4df98]">No se pudo cargar la bandeja: {reportError.message}</p>
          ) : reports.length === 0 ? (
            <div className="grid min-h-56 place-items-center border border-dashed border-white/10 text-center"><div><Search className="mx-auto h-7 w-7 text-[var(--admin-muted)]" /><p className="mt-4 font-serif text-2xl font-black">Nada por aquí.</p><p className="mt-2 text-sm text-[var(--admin-muted)]">No hay reportes en este estado.</p></div></div>
          ) : (
            <div className="space-y-3">
              {reports.map((report) => (
                <article key={report.id} id={`reporte-${report.id}`} className="grid min-w-0 gap-5 rounded-2xl border border-[var(--admin-line)] bg-[var(--admin-surface)] p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_300px]">
                  <div className="min-w-0 [overflow-wrap:anywhere]">
                    <p className="text-xs font-black uppercase text-[var(--brand-lime)]">{reportLabels[report.report_type] ?? report.report_type}</p>
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
                      {report.contact && <span>Contacto: <span className="text-[var(--admin-muted)]">{report.contact}</span></span>}
                    </div>
                    {report.route_key && Array.isArray(report.proposed_path) && (
                      <ReportPathComparison routeKey={report.route_key} proposedPath={report.proposed_path} />
                    )}
                    <ContributorHistory reputation={report.submitted_by_hash ? contributorHistory.get(report.submitted_by_hash) ?? null : null} />
                  </div>

                  <form action={reviewCommunityReport} className="min-w-0 space-y-3 border-t border-[var(--admin-line)] pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
                    <input type="hidden" name="reportId" value={report.id} />
                    <label className="block"><span className="text-xs font-bold text-[var(--admin-muted)]">Nota interna</span><textarea name="note" maxLength={1000} defaultValue={report.moderator_note ?? ""} rows={2} placeholder="Qué se comprobó" className="mt-1 w-full border border-[var(--admin-line)] bg-[var(--brand-header)] px-3 py-2 text-sm text-[var(--brand-white)] placeholder:text-[var(--admin-muted)] focus:border-[var(--brand-lime)]" /></label>
                    <div className="flex flex-wrap gap-1.5 text-xs font-semibold">
                      <button name="status" value="reviewing" title="Marcar en revisión" className="min-h-11 border border-[var(--admin-line)] px-2.5 hover:border-[var(--brand-lime)]">{report.status === "reviewing" ? "Guardar nota" : "En revisión"}</button>
                      <button name="status" value="approved" className="min-h-11 border border-[var(--admin-line)] px-2.5 hover:border-[var(--brand-lime)]">{report.status === "approved" ? "Guardar nota" : "Aprobar"}</button>
                      <button name="status" value="rejected" className="min-h-11 border border-[var(--admin-line)] px-2.5 text-[#f2b7af] hover:border-[#f2b7af]">{report.status === "rejected" ? "Guardar nota" : "Descartar"}</button>
                    </div>
                    {report.status === "approved" ? (
                      <Link href={getReportRouteEditorHref(report)} className="flex min-h-11 items-center justify-between gap-2 rounded-lg bg-[var(--brand-lime)] px-3 text-sm font-bold text-[var(--brand-deep)]">
                        Editar ruta <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </Link>
                    ) : report.status !== "rejected" && (report.route_id || report.route_key || report.route_name) ? (
                      <button name="status" value="approve_edit" className="flex min-h-11 w-full items-center justify-between gap-2 rounded-lg bg-[var(--brand-lime)] px-3 text-left text-sm font-bold text-[var(--brand-deep)]">
                        Aprobar y editar ruta <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </button>
                    ) : null}
                  </form>
                </article>
              ))}
            </div>
          )}
        </section>

        <aside className="mt-4 flex gap-3 border-t border-[var(--admin-line)] pt-5 text-xs leading-5 text-[var(--admin-muted)]"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand-lime)]" /><p>Aprobar un reporte reconoce que la información es válida; publicar una nueva geometría será un paso separado y versionado.</p></aside>
      </div>
    </main>
  );
}
