import {
  CheckCircle2,
  CircleAlert,
  Clock3,
  ExternalLink,
  RotateCcw,
  Search,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { reviewRouteConfirmation } from "@/app/admin/actions";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminStatusNav from "@/components/admin/AdminStatusNav";
import ContributorHistory from "@/components/admin/ContributorHistory";
import { getAdminAccess } from "@/lib/admin-auth";
import { getContributorReputations } from "@/lib/community-reputation";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type ConfirmationStatus = "pending" | "accepted" | "dismissed";
type ConfirmationType = "seen_today" | "not_running" | "changed";

type ConfirmationRow = {
  id: string;
  route_key: string;
  route_name: string;
  confirmation_type: ConfirmationType;
  note: string | null;
  source_path: string | null;
  submitted_by_hash: string | null;
  status: ConfirmationStatus;
  moderator_note: string | null;
  observed_at: string;
};

const filters: ReadonlyArray<{ value: ConfirmationStatus; label: string }> = [
  { value: "pending", label: "Por revisar" },
  { value: "accepted", label: "Aceptadas" },
  { value: "dismissed", label: "Descartadas" },
];

const typeDetails: Record<ConfirmationType, { label: string; accent: string; icon: typeof CheckCircle2 }> = {
  seen_today: { label: "La vio circular", accent: "text-[var(--brand-lime)]", icon: CheckCircle2 },
  changed: { label: "Reporta cambios", accent: "text-[#f4c84a]", icon: CircleAlert },
  not_running: { label: "Dice que ya no circula", accent: "text-[#e98b80]", icon: XCircle },
};

function safeStatus(value: string | undefined): ConfirmationStatus {
  return filters.some((filter) => filter.value === value) ? value as ConfirmationStatus : "pending";
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Mexico_City",
  }).format(new Date(value));
}

type Props = { searchParams: Promise<{ estado?: string; ruta?: string }> };

export default async function AdminSignalsPage({ searchParams }: Props) {
  const [access, params] = await Promise.all([getAdminAccess(), searchParams]);
  if (access.status !== "admin") redirect("/admin");

  const supabase = createSupabaseAdminClient();
  if (!supabase) redirect("/admin/login");

  const status = safeStatus(params.estado);
  const routeName = params.ruta?.trim().slice(0, 140) ?? "";
  const countRequests = filters.map((filter) => supabase
    .from("route_confirmations")
    .select("id", { count: "exact", head: true })
    .eq("status", filter.value));

  let confirmationQuery = supabase
    .from("route_confirmations")
    .select("id,route_key,route_name,confirmation_type,note,source_path,submitted_by_hash,status,moderator_note,observed_at")
    .eq("status", status)
    .order("observed_at", { ascending: false })
    .limit(100);
  if (routeName) confirmationQuery = confirmationQuery.eq("route_name", routeName);

  const [counts, confirmationResult] = await Promise.all([
    Promise.all(countRequests),
    confirmationQuery,
  ]);
  const confirmations = (confirmationResult.data ?? []) as ConfirmationRow[];
  const contributorHistory = await getContributorReputations(confirmations.map((confirmation) => confirmation.submitted_by_hash));

  const filterHref = (nextStatus: ConfirmationStatus) => {
    const query = new URLSearchParams({ estado: nextStatus });
    if (routeName) query.set("ruta", routeName);
    return `/admin/signals?${query}`;
  };

  return (
    <main className="min-h-dvh bg-[var(--admin-bg)] text-[var(--brand-white)]">
      <AdminHeader email={access.email} active="signals" />

      <div className="mx-auto max-w-[1500px] px-5 py-8 sm:px-8 lg:py-10">
        <div className="grid gap-4 pb-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
          <div>
            <p className="text-xs font-black uppercase text-[var(--brand-lime)]">Pulso comunitario</p>
            <h1 className="mt-2 text-4xl font-bold sm:text-5xl">Señales de rutas</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--admin-muted)]">Revisa confirmaciones de servicio y alertas sobre recorridos.</p>
          </div>
          {routeName ? (
            <div className="border-l-2 border-[#b8e840] bg-[#b8e840]/[0.05] px-4 py-3">
              <p className="text-[10px] font-black uppercase text-[var(--admin-muted)]">Filtrando ruta</p>
              <div className="mt-1 flex items-center justify-between gap-3"><strong className="truncate text-sm">{routeName}</strong><Link href={`/admin/signals?estado=${status}`} className="shrink-0 text-xs font-bold text-[var(--brand-lime)]">Ver todas</Link></div>
            </div>
          ) : (
            <p className="text-xs leading-5 text-[var(--admin-muted)]">Las señales repetidas por el mismo dispositivo y ruta durante un día se registran una sola vez.</p>
          )}
        </div>

        <AdminStatusNav label="Filtrar señales" items={filters.map((filter, index) => ({
          href: filterHref(filter.value), label: filter.label, selected: status === filter.value, count: counts[index].count,
        }))} />

        <section className="py-6" aria-labelledby="signals-title">
          <div className="mb-5 flex items-center justify-between"><h2 id="signals-title" className="text-sm font-black uppercase text-[var(--admin-muted)]">{filters.find((filter) => filter.value === status)?.label}</h2><span className="text-xs text-[var(--admin-muted)]">Máximo 100 por vista</span></div>

          {confirmationResult.error ? (
            <p className="border-l-2 border-[#f4c84a] px-4 py-3 text-sm text-[#f4df98]">No se pudo cargar la bandeja: {confirmationResult.error.message}</p>
          ) : confirmations.length === 0 ? (
            <div className="grid min-h-56 place-items-center border border-dashed border-white/10 text-center"><div><Search className="mx-auto h-7 w-7 text-[var(--admin-muted)]" /><p className="mt-4 font-serif text-2xl font-black">Nada por revisar.</p><p className="mt-2 text-sm text-[var(--admin-muted)]">No hay señales en este estado.</p></div></div>
          ) : (
            <div className="space-y-3">
              {confirmations.map((confirmation) => {
                const detail = typeDetails[confirmation.confirmation_type];
                const SignalIcon = detail.icon;
                return (
                  <article key={confirmation.id} className="admin-card grid gap-4 p-4 lg:grid-cols-[minmax(0,210px)_minmax(0,1fr)_300px]">
                    <div>
                      <p className={`flex items-center gap-2 text-xs font-black uppercase ${detail.accent}`}><SignalIcon className="h-4 w-4" aria-hidden="true" /> {detail.label}</p>
                      <h3 className="mt-2 text-base font-bold text-[var(--brand-white)]">{confirmation.route_name}</h3>
                      <p className="mt-1 text-[11px] text-[var(--admin-muted)]">{formatDate(confirmation.observed_at)}</p>
                    </div>

                    <div className="min-w-0">
                      <p className="text-sm leading-7 text-[var(--admin-muted)]">{confirmation.note || "Confirmación rápida sin comentario adicional."}</p>
                      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs">
                        <Link href={`/admin/routes?buscar=${encodeURIComponent(confirmation.route_name)}`} className="admin-button inline-flex min-h-11 items-center px-3 font-bold">Buscar ruta</Link>
                        {confirmation.source_path && <Link href={confirmation.source_path} target="_blank" className="inline-flex items-center gap-1 text-[var(--admin-muted)] hover:text-[var(--brand-lime)]">Abrir página <ExternalLink className="h-3 w-3" /></Link>}
                      </div>
                      <ContributorHistory reputation={confirmation.submitted_by_hash ? contributorHistory.get(confirmation.submitted_by_hash) ?? null : null} />
                    </div>

                    <form action={reviewRouteConfirmation} className="min-w-0 border-t border-[var(--admin-line)] pt-3 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
                      <input type="hidden" name="confirmationId" value={confirmation.id} />
                      <label className="block"><span className="text-xs font-bold text-[var(--admin-muted)]">Nota interna</span><textarea name="note" maxLength={1000} defaultValue={confirmation.moderator_note ?? ""} rows={2} placeholder="Qué se comprobó" className="admin-field mt-1 w-full" /></label>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        {confirmation.status === "pending" ? (
                          <>
                            <button name="status" value="accepted" className="admin-button admin-primary inline-flex min-h-11 items-center justify-center gap-2 text-xs font-bold"><CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Aceptar</button>
                            <button name="status" value="dismissed" className="admin-button inline-flex min-h-11 items-center justify-center gap-2 text-xs font-bold"><XCircle className="h-4 w-4" aria-hidden="true" /> Descartar</button>
                          </>
                        ) : (
                          <button name="status" value="pending" className="col-span-2 inline-flex h-10 items-center justify-center gap-2 border border-white/15 text-xs font-bold text-[var(--admin-muted)] transition hover:border-[#6aab48]/50 hover:text-[var(--brand-white)]"><RotateCcw className="h-4 w-4" /> Volver a revisión</button>
                        )}
                      </div>
                    </form>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <aside className="flex gap-3 border-t border-[var(--admin-line)] pt-5 text-xs leading-5 text-[var(--admin-muted)]"><Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand-lime)]" /><p>Cada cambio de estado queda registrado con fecha y administrador. Los datos técnicos del dispositivo nunca se muestran en esta pantalla.</p></aside>
      </div>
    </main>
  );
}
