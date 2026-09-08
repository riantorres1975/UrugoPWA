import { AlertCircle, CheckCircle2, Clock3, ExternalLink, Search, ShieldCheck, XCircle } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import AdminHeader from "@/components/admin/AdminHeader";
import ContributorHistory from "@/components/admin/ContributorHistory";
import ReportPathComparison from "@/components/admin/ReportPathComparison";
import { getAdminAccess } from "@/lib/admin-auth";
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
      <main className="grid min-h-dvh place-items-center bg-[#0c110a] px-5 text-[#e8f2d8]">
        <section className="max-w-lg border border-[#f4c84a]/30 bg-[#111a0d] p-8">
          <ShieldCheck className="h-8 w-8 text-[#f4c84a]" aria-hidden="true" />
          <h1 className="mt-6 font-serif text-3xl font-black">Acceso no autorizado.</h1>
          <p className="mt-3 text-sm leading-7 text-[#a8c888]">Agrega {access.email ?? "este correo"} a <code className="text-[#e8f2d8]">ADMIN_EMAILS</code> o a la tabla de administradores.</p>
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
    <main className="min-h-dvh bg-[#0c110a] text-[#e8f2d8]">
      <AdminHeader email={access.email} active="reports" />

      <div className="mx-auto max-w-[1500px] px-5 py-8 sm:px-8 lg:py-10">
        <div className="flex flex-col gap-5 border-b border-white/[0.08] pb-8 md:flex-row md:items-end md:justify-between">
          <div><p className="text-xs font-black uppercase text-[#b8e840]">Bandeja comunitaria</p><h1 className="mt-2 font-serif text-4xl font-black sm:text-5xl">Revisar antes de mover el mapa.</h1></div>
          <Link href="/reportar-error" target="_blank" className="inline-flex h-10 w-fit items-center gap-2 border border-white/15 px-4 text-xs font-bold text-[#a8c888] transition hover:border-[#6aab48]/60 hover:text-[#e8f2d8]">Ver formulario público <ExternalLink className="h-3.5 w-3.5" /></Link>
        </div>

        <section className="grid grid-cols-2 border-b border-white/[0.08] md:grid-cols-4" aria-label="Resumen de reportes">
          {filters.map((filter, index) => (
            <Link key={filter.value} href={`/admin?estado=${filter.value}`} className={`border-white/[0.08] px-4 py-5 transition hover:bg-white/[0.02] ${index < 3 ? "md:border-r" : ""} ${index % 2 === 0 ? "border-r" : ""}`}>
              <span className="text-xs font-bold text-[#78965f]">{filter.label}</span>
              <strong className="mt-2 block font-serif text-3xl text-[#e8f2d8]">{counts[index].count ?? 0}</strong>
            </Link>
          ))}
        </section>

        <nav className="flex gap-1 overflow-x-auto border-b border-white/[0.08] py-4" aria-label="Filtrar reportes">
          {filters.map((filter) => <Link key={filter.value} href={`/admin?estado=${filter.value}`} aria-current={status === filter.value ? "page" : undefined} className={`shrink-0 px-4 py-2 text-xs font-black transition ${status === filter.value ? "bg-[#b8e840] text-[#0c110a]" : "text-[#78965f] hover:bg-white/[0.04] hover:text-[#e8f2d8]"}`}>{filter.label}</Link>)}
        </nav>

        <section className="py-6" aria-labelledby="reports-title">
          <div className="mb-5 flex items-center justify-between"><h2 id="reports-title" className="text-sm font-black uppercase text-[#a8c888]">{filters.find((filter) => filter.value === status)?.label}</h2><span className="text-xs text-[#60784f]">Máximo 50 por vista</span></div>

          {reportError ? (
            <p className="border-l-2 border-[#f4c84a] px-4 py-3 text-sm text-[#f4df98]">No se pudo cargar la bandeja: {reportError.message}</p>
          ) : reports.length === 0 ? (
            <div className="grid min-h-56 place-items-center border border-dashed border-white/10 text-center"><div><Search className="mx-auto h-7 w-7 text-[#60784f]" /><p className="mt-4 font-serif text-2xl font-black">Nada por aquí.</p><p className="mt-2 text-sm text-[#78965f]">No hay reportes en este estado.</p></div></div>
          ) : (
            <div className="divide-y divide-white/[0.08] border-y border-white/[0.08]">
              {reports.map((report) => (
                <article key={report.id} className="grid gap-6 py-6 lg:grid-cols-[190px_minmax(0,1fr)_310px]">
                  <div>
                    <p className="text-xs font-black uppercase text-[#b8e840]">{reportLabels[report.report_type] ?? report.report_type}</p>
                    <p className="mt-3 text-sm font-bold text-[#e8f2d8]">{report.route_name || "Sin ruta indicada"}</p>
                    <p className="mt-1 text-xs leading-5 text-[#78965f]">{report.place || "Sin ubicación aproximada"}</p>
                    <p className="mt-4 text-[11px] text-[#60784f]">{formatDate(report.created_at)}</p>
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm leading-7 text-[#c9dbb9]">{report.description}</p>
                    {report.expected_result && <div className="mt-4 border-l-2 border-[#6aab48] pl-4"><p className="text-[10px] font-black uppercase text-[#78965f]">Debería mostrar</p><p className="mt-1 text-sm leading-6 text-[#a8c888]">{report.expected_result}</p></div>}
                    <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[#60784f]">
                      {report.submission_source === "external_api" && (
                        <span className="font-bold text-[#57d6e8]">
                          API: {report.api_client_id ? apiClientNames.get(report.api_client_id) ?? "integración revocada" : "integración eliminada"}
                        </span>
                      )}
                      {report.source_path && <Link href={report.source_path} target="_blank" className="hover:text-[#b8e840]">Abrir página relacionada</Link>}
                      {report.route_key && <Link href={`/ruta/${report.route_key}`} target="_blank" className="hover:text-[#b8e840]">Ver ficha de la ruta</Link>}
                      {report.evidence_url?.startsWith("https://") && <a href={report.evidence_url} target="_blank" rel="noreferrer" className="font-bold text-[#f4c84a] hover:underline">Abrir evidencia</a>}
                      {report.contact && <span>Contacto: <span className="text-[#a8c888]">{report.contact}</span></span>}
                      {report.status === "approved" && (
                        <Link href={report.route_id ? `/admin/routes/${report.route_id}?reporte=${report.id}` : `/admin/routes?buscar=${encodeURIComponent(report.route_name ?? "")}&reporte=${report.id}`} className="font-bold text-[#b8e840] hover:underline">
                          Preparar cambio de ruta
                        </Link>
                      )}
                    </div>
                    {report.route_key && Array.isArray(report.proposed_path) && (
                      <ReportPathComparison routeKey={report.route_key} proposedPath={report.proposed_path} />
                    )}
                    <ContributorHistory reputation={report.submitted_by_hash ? contributorHistory.get(report.submitted_by_hash) ?? null : null} />
                  </div>

                  <form action={reviewCommunityReport} className="border-l border-white/[0.08] pl-5">
                    <input type="hidden" name="reportId" value={report.id} />
                    <label className="block"><span className="text-[10px] font-black uppercase text-[#78965f]">Nota interna</span><textarea name="note" maxLength={1000} defaultValue={report.moderator_note ?? ""} rows={3} placeholder="Qué se comprobó..." className="mt-2 w-full border border-white/10 bg-[#090d08] px-3 py-2 text-xs leading-5 text-[#dceaca] outline-none placeholder:text-white/20 focus:border-[#6aab48]/60" /></label>
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <button name="status" value="reviewing" title="Marcar en revisión" className="grid h-10 place-items-center border border-[#f4c84a]/25 text-[#f4c84a] transition hover:bg-[#f4c84a]/10"><Clock3 className="h-4 w-4" /></button>
                      <button name="status" value="approved" title="Aprobar reporte" className="grid h-10 place-items-center border border-[#6aab48]/30 text-[#b8e840] transition hover:bg-[#6aab48]/10"><CheckCircle2 className="h-4 w-4" /></button>
                      <button name="status" value="rejected" title="Descartar reporte" className="grid h-10 place-items-center border border-[#dd6b5f]/25 text-[#e98b80] transition hover:bg-[#dd6b5f]/10"><XCircle className="h-4 w-4" /></button>
                    </div>
                  </form>
                </article>
              ))}
            </div>
          )}
        </section>

        <aside className="mt-4 flex gap-3 border-t border-white/[0.08] pt-5 text-xs leading-5 text-[#60784f]"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#b8e840]" /><p>Aprobar un reporte reconoce que la información es válida; publicar una nueva geometría será un paso separado y versionado.</p></aside>
      </div>
    </main>
  );
}
