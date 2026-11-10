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
        <div className="grid gap-6 border-b border-[var(--admin-line)] pb-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
          <div>
            <p className="text-xs font-black uppercase text-[var(--brand-lime)]">Pulso comunitario</p>
            <h1 className="mt-2 font-serif text-4xl font-black sm:text-5xl">Lo que la calle está diciendo.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--admin-muted)]">Una señal ayuda a decidir qué comprobar. Aceptarla deja constancia; nunca cambia por sí sola el mapa.</p>
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

        <section className="grid grid-cols-3 border-b border-[var(--admin-line)]" aria-label="Resumen de señales">
          {filters.map((filter, index) => (
            <Link key={filter.value} href={filterHref(filter.value)} className={`px-4 py-5 transition hover:bg-white/[0.02] ${index < 2 ? "border-r border-[var(--admin-line)]" : ""}`}>
              <span className="text-xs font-bold text-[var(--admin-muted)]">{filter.label}</span>
              <strong className="mt-2 block font-serif text-3xl text-[var(--brand-white)]">{counts[index].count ?? 0}</strong>
            </Link>
          ))}
        </section>

        <nav className="flex gap-1 overflow-x-auto border-b border-[var(--admin-line)] py-4" aria-label="Filtrar señales">
          {filters.map((filter) => (
            <Link key={filter.value} href={filterHref(filter.value)} aria-current={status === filter.value ? "page" : undefined} className={`shrink-0 px-4 py-2 text-xs font-black transition ${status === filter.value ? "bg-[var(--brand-lime)] text-[#0c110a]" : "text-[var(--admin-muted)] hover:bg-white/[0.04] hover:text-[var(--brand-white)]"}`}>{filter.label}</Link>
          ))}
        </nav>

        <section className="py-6" aria-labelledby="signals-title">
          <div className="mb-5 flex items-center justify-between"><h2 id="signals-title" className="text-sm font-black uppercase text-[var(--admin-muted)]">{filters.find((filter) => filter.value === status)?.label}</h2><span className="text-xs text-[var(--admin-muted)]">Máximo 100 por vista</span></div>

          {confirmationResult.error ? (
            <p className="border-l-2 border-[#f4c84a] px-4 py-3 text-sm text-[#f4df98]">No se pudo cargar la bandeja: {confirmationResult.error.message}</p>
          ) : confirmations.length === 0 ? (
            <div className="grid min-h-56 place-items-center border border-dashed border-white/10 text-center"><div><Search className="mx-auto h-7 w-7 text-[var(--admin-muted)]" /><p className="mt-4 font-serif text-2xl font-black">Nada por revisar.</p><p className="mt-2 text-sm text-[var(--admin-muted)]">No hay señales en este estado.</p></div></div>
          ) : (
            <div className="divide-y divide-white/[0.08] border-y border-[var(--admin-line)]">
              {confirmations.map((confirmation) => {
                const detail = typeDetails[confirmation.confirmation_type];
                const SignalIcon = detail.icon;
                return (
                  <article key={confirmation.id} className="grid gap-6 py-6 lg:grid-cols-[220px_minmax(0,1fr)_330px]">
                    <div>
                      <p className={`flex items-center gap-2 text-xs font-black uppercase ${detail.accent}`}><SignalIcon className="h-4 w-4" aria-hidden="true" /> {detail.label}</p>
                      <p className="mt-4 text-sm font-bold text-[var(--brand-white)]">{confirmation.route_name}</p>
                      <p className="mt-1 text-[11px] text-[var(--admin-muted)]">{formatDate(confirmation.observed_at)}</p>
                    </div>

                    <div className="min-w-0">
                      <p className="text-sm leading-7 text-[var(--admin-muted)]">{confirmation.note || "Confirmación rápida sin comentario adicional."}</p>
                      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs">
                        <Link href={`/admin/routes?buscar=${encodeURIComponent(confirmation.route_name)}`} className="font-bold text-[var(--brand-lime)] hover:underline">Buscar en inventario</Link>
                        {confirmation.source_path && <Link href={confirmation.source_path} target="_blank" className="inline-flex items-center gap-1 text-[var(--admin-muted)] hover:text-[var(--brand-lime)]">Abrir página <ExternalLink className="h-3 w-3" /></Link>}
                      </div>
                      <ContributorHistory reputation={confirmation.submitted_by_hash ? contributorHistory.get(confirmation.submitted_by_hash) ?? null : null} />
                    </div>

                    <form action={reviewRouteConfirmation} className="border-l border-[var(--admin-line)] pl-5">
                      <input type="hidden" name="confirmationId" value={confirmation.id} />
                      <label className="block"><span className="text-[10px] font-black uppercase text-[var(--admin-muted)]">Nota interna</span><textarea name="note" maxLength={1000} defaultValue={confirmation.moderator_note ?? ""} rows={3} placeholder="Qué se comprobó..." className="mt-2 w-full border border-white/10 bg-[var(--brand-header)] px-3 py-2 text-xs leading-5 text-[#dceaca] outline-none placeholder:text-white/20 focus:border-[#6aab48]/60" /></label>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        {confirmation.status === "pending" ? (
                          <>
                            <button name="status" value="accepted" className="inline-flex h-10 items-center justify-center gap-2 border border-[#6aab48]/30 text-xs font-bold text-[var(--brand-lime)] transition hover:bg-[#6aab48]/10"><CheckCircle2 className="h-4 w-4" /> Aceptar</button>
                            <button name="status" value="dismissed" className="inline-flex h-10 items-center justify-center gap-2 border border-[#dd6b5f]/25 text-xs font-bold text-[#e98b80] transition hover:bg-[#dd6b5f]/10"><XCircle className="h-4 w-4" /> Descartar</button>
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
