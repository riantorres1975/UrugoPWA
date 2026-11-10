import { Ban, Clock3, KeyRound, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import {
  revokeCommunityApiClient,
  updateCommunityApiClient,
} from "@/app/admin/actions";
import AdminHeader from "@/components/admin/AdminHeader";
import ApiClientCreateForm from "@/components/admin/ApiClientCreateForm";
import { getAdminAccess } from "@/lib/admin-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type ApiClientRow = {
  active: boolean;
  created_at: string;
  hourly_limit: number;
  id: string;
  key_prefix: string;
  last_used_at: string | null;
  name: string;
  revoked_at: string | null;
};

function formatDate(value: string | null): string {
  if (!value) return "Nunca";
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Mexico_City",
  }).format(new Date(value));
}

function isMissingTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === "42P01"
    || error.code === "PGRST205"
    || error.message?.includes("community_api_clients") === true;
}

export default async function AdminIntegrationsPage() {
  const access = await getAdminAccess();
  if (access.status !== "admin") redirect("/admin");

  const supabase = createSupabaseAdminClient();
  if (!supabase) redirect("/admin/login");

  const result = await supabase
    .from("community_api_clients")
    .select("id,name,key_prefix,active,hourly_limit,last_used_at,revoked_at,created_at")
    .order("created_at", { ascending: false });
  const clients = (result.data ?? []) as ApiClientRow[];
  const activeCount = clients.filter((client) => client.active).length;

  return (
    <main className="min-h-dvh bg-[var(--admin-bg)] text-[var(--brand-white)]">
      <AdminHeader email={access.email} active="integrations" />
      <div className="mx-auto max-w-[1500px] px-5 py-8 sm:px-8 lg:py-10">
        <header className="grid gap-6 border-b border-[var(--admin-line)] pb-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
          <div>
            <p className="text-xs font-black uppercase text-[var(--brand-lime)]">Acceso externo</p>
            <h1 className="mt-2 font-serif text-4xl font-black sm:text-5xl">Llaves con dueño y límite.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--admin-muted)]">Cada proyecto recibe su propia clave. Puede proponer datos, pero nunca aprobarlos ni cambiar el mapa directamente.</p>
          </div>
          <dl className="grid grid-cols-2 border-y border-white/10 text-center">
            <div className="border-r border-white/10 py-4"><dt className="text-[10px] font-black uppercase text-[var(--admin-muted)]">Activas</dt><dd className="mt-1 font-serif text-3xl font-black text-[var(--brand-lime)]">{activeCount}</dd></div>
            <div className="py-4"><dt className="text-[10px] font-black uppercase text-[var(--admin-muted)]">Históricas</dt><dd className="mt-1 font-serif text-3xl font-black">{clients.length}</dd></div>
          </dl>
        </header>

        {isMissingTable(result.error) ? (
          <section className="mt-8 border-l-2 border-[#f4c84a] bg-[#f4c84a]/[0.05] px-5 py-5">
            <h2 className="font-serif text-2xl font-black text-[#f4df98]">Falta aplicar la migración.</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--admin-muted)]">Ejecuta <code>20260904160903_community_api_clients.sql</code> en el proyecto Supabase propietario. El resto del panel sigue disponible mientras tanto.</p>
          </section>
        ) : result.error ? (
          <p className="mt-8 border-l-2 border-[#dd6b5f] px-4 py-3 text-sm text-[#e98b80]">No se pudieron cargar las integraciones: {result.error.message}</p>
        ) : (
          <>
            <section className="mt-8" aria-label="Crear integración"><ApiClientCreateForm /></section>
            <section className="mt-10" aria-labelledby="api-clients-title">
              <div className="mb-4 flex items-center justify-between"><h2 id="api-clients-title" className="text-sm font-black uppercase text-[var(--admin-muted)]">Credenciales emitidas</h2><span className="text-xs text-[var(--admin-muted)]">La clave completa no se almacena</span></div>
              {clients.length === 0 ? (
                <div className="grid min-h-48 place-items-center border border-dashed border-white/10 text-center"><div><KeyRound className="mx-auto h-7 w-7 text-[var(--admin-muted)]" /><p className="mt-4 font-serif text-2xl font-black">Aún no hay integraciones.</p></div></div>
              ) : (
                <div className="divide-y divide-white/[0.08] border-y border-[var(--admin-line)]">
                  {clients.map((client) => (
                    <article key={client.id} className="grid gap-5 py-5 lg:grid-cols-[minmax(220px,1fr)_180px_180px_minmax(260px,340px)] lg:items-center">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2"><strong className="truncate text-sm">{client.name}</strong><span className={`px-2 py-1 text-[10px] font-black ${client.active ? "bg-[#6aab48]/10 text-[var(--brand-lime)]" : "bg-white/[0.05] text-[var(--admin-muted)]"}`}>{client.active ? "ACTIVA" : "REVOCADA"}</span></div>
                        <code className="mt-2 block text-xs text-[var(--admin-muted)]">{client.key_prefix}...</code>
                      </div>
                      <div className="text-xs text-[var(--admin-muted)]"><Clock3 className="mb-2 h-4 w-4 text-[#57d6e8]" /><span className="block">Último uso</span><strong className="mt-1 block text-[var(--admin-muted)]">{formatDate(client.last_used_at)}</strong></div>
                      <div className="text-xs text-[var(--admin-muted)]"><ShieldCheck className="mb-2 h-4 w-4 text-[var(--brand-lime)]" /><span className="block">Creada</span><strong className="mt-1 block text-[var(--admin-muted)]">{formatDate(client.created_at)}</strong></div>
                      {client.active ? (
                        <div className="grid grid-cols-[minmax(0,1fr)_44px] gap-2">
                          <form action={updateCommunityApiClient} className="flex min-w-0">
                            <input type="hidden" name="clientId" value={client.id} />
                            <label className="min-w-0 flex-1"><span className="sr-only">Cuota por hora de {client.name}</span><input name="hourlyLimit" type="number" min={1} max={1000} required defaultValue={client.hourly_limit} className="h-10 w-full border border-white/10 bg-[var(--brand-header)] px-3 text-xs tabular-nums text-[#dceaca] outline-none focus:border-[#6aab48]/70" /></label>
                            <button className="h-10 border border-l-0 border-white/10 px-3 text-[10px] font-black text-[var(--admin-muted)] hover:text-[var(--brand-white)]">Guardar</button>
                          </form>
                          <form action={revokeCommunityApiClient}>
                            <input type="hidden" name="clientId" value={client.id} />
                            <button aria-label={`Revocar ${client.name}`} title="Revocar clave" className="grid h-10 w-10 place-items-center border border-[#dd6b5f]/25 text-[#e98b80] transition hover:bg-[#dd6b5f]/10"><Ban className="h-4 w-4" /></button>
                          </form>
                        </div>
                      ) : (
                        <p className="text-xs text-[var(--admin-muted)]">Revocada {formatDate(client.revoked_at)}</p>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
