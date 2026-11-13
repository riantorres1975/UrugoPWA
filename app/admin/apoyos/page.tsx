import Link from "next/link";
import { redirect } from "next/navigation";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminPagination from "@/components/admin/AdminPagination";
import SupportReviewForm from "@/components/admin/SupportReviewForm";
import { getAdminAccess } from "@/lib/admin-auth";
import { SUPPORT_METHODS, formatSupportAmount, type SupportMethod } from "@/lib/support-contributions";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const statuses = { pending: "Pendientes", confirmed: "Confirmados", rejected: "Rechazados" } as const;
type Contribution = { id: string; revision: number; method: SupportMethod; amount_cents: number; payment_reference: string; visibility: string; display_name: string | null; show_amount: boolean; status: string; created_at: string; moderator_note: string | null };

export default async function SupportAdminPage({ searchParams }: { searchParams: Promise<{ estado?: string; pagina?: string }> }) {
  const [access, params] = await Promise.all([getAdminAccess(), searchParams]);
  if (access.status !== "admin") redirect("/admin");
  const db = createSupabaseAdminClient();
  if (!db) redirect("/admin/login");
  const status = Object.hasOwn(statuses, params.estado ?? "") ? params.estado as keyof typeof statuses : "pending";
  const parsedPage = Number(params.pagina ?? 1);
  const page = Number.isSafeInteger(parsedPage) ? Math.max(1, Math.min(10000, parsedPage)) : 1;
  const pageSize = 20;
  const { data, error, count } = await db.from("support_contributions").select("id,revision,method,amount_cents,payment_reference,visibility,display_name,show_amount,status,created_at,moderator_note", { count: "exact" }).eq("status", status).order("created_at", { ascending: false }).order("id").range((page - 1) * pageSize, page * pageSize - 1).abortSignal(AbortSignal.timeout(8000));
  return <main className="admin-shell min-h-dvh"><AdminHeader email={access.email} active="support" /><div className="mx-auto max-w-[1200px] px-5 py-8 sm:px-8">
    <p className="text-xs font-bold uppercase tracking-widest text-[var(--brand-lime)]">Comunidad</p><h1 className="mt-2 text-4xl font-bold">Apoyos a UruGo</h1>
    <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--admin-muted)]">Verifica cada aviso contra los movimientos reales de PayPal, Mercado Pago o la cuenta bancaria. Los avisos pendientes nunca se presentan como donaciones recibidas.</p>
    <div className="my-6 flex flex-wrap gap-2" role="group" aria-label="Estado de los apoyos">{Object.entries(statuses).map(([key, label]) => <Link key={key} href={`/admin/apoyos?estado=${key}`} aria-current={status === key ? "page" : undefined} className={`admin-button inline-flex min-h-11 items-center px-4 text-sm font-bold ${status === key ? "admin-primary" : ""}`}>{label}</Link>)}</div>
    {error ? <p role="alert" className="admin-card p-5 text-sm text-amber-200">No se pudieron cargar los avisos. Comprueba la conexión y la migración de aportaciones.</p> : <>
      {(data ?? []).length === 0 ? <div className="admin-card p-8"><h2 className="text-xl font-semibold">No hay avisos en esta página.</h2><p className="mt-2 text-sm text-[var(--admin-muted)]">Los nuevos avisos aparecerán en Pendientes. No se crean aportaciones de ejemplo.</p></div> : <div className="grid gap-4 lg:grid-cols-2">{(data as Contribution[]).map((row) => <article key={`${row.id}:${row.revision}`} className="admin-card min-w-0 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-bold">{SUPPORT_METHODS[row.method]}</h2><p className="mt-1 text-xs text-[var(--admin-muted)]">Aviso del {new Date(row.created_at).toLocaleString("es-MX", { timeZone: "America/Mexico_City" })}</p></div><strong className="text-xl">{formatSupportAmount(row.amount_cents)} MXN</strong></div>
        <dl className="mt-4 grid gap-3 text-sm"><div><dt className="text-xs text-[var(--admin-muted)]">Identificador privado del pago</dt><dd className="mt-1 break-all font-mono">{row.payment_reference}</dd></div><div><dt className="text-xs text-[var(--admin-muted)]">Elección de privacidad</dt><dd className="mt-1">{row.visibility === "private" ? "No aparecer en público" : row.visibility === "named" ? `Nombre público: ${row.display_name}` : "Apoyo anónimo"}{row.visibility !== "private" && ` · Monto ${row.show_amount ? "visible" : "oculto"}`}</dd></div></dl>
        <SupportReviewForm id={row.id} revision={row.revision} amount={row.amount_cents} note={row.moderator_note} status={row.status} />
      </article>)}</div>}
      <AdminPagination page={page} pageSize={pageSize} total={count ?? 0} href={(p) => `/admin/apoyos?estado=${status}&pagina=${p}`} itemLabel="avisos" />
    </>}
    <p className="mt-6 text-xs leading-6 text-[var(--admin-muted)]">Confirmar publica solo los datos autorizados; los apoyos privados permanecen fuera del muro. Retirar un reconocimiento lo oculta también en inicio y apoyo. Cada decisión se guarda en la bitácora privada.</p>
  </div></main>;
}
