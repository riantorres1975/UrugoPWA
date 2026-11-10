import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import AdminLoginForm from "@/components/AdminLoginForm";
import SiteBrand from "@/components/SiteBrand";
import { getAdminAccess } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ error?: string }> };

export default async function AdminLoginPage({ searchParams }: Props) {
  const [access, params] = await Promise.all([getAdminAccess(), searchParams]);
  if (access.status === "admin") redirect("/admin");

  return (
    <main className="min-h-dvh bg-[var(--admin-bg)] px-5 py-8 text-[var(--brand-white)] sm:px-8">
      <div className="mx-auto flex max-w-6xl items-center justify-between border-b border-[var(--admin-line)] pb-6">
        <SiteBrand />
        <Link href="/" className="inline-flex items-center gap-2 text-xs font-bold text-[var(--admin-muted)] transition hover:text-[var(--brand-white)]"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Volver a UruGo</Link>
      </div>

      <div className="mx-auto grid max-w-6xl gap-8 py-8 lg:grid-cols-[1fr_430px] lg:items-center lg:py-20">
        <section className="order-last lg:order-none">
          <p className="text-xs font-black uppercase text-[var(--brand-lime)]">Administración privada</p>
          <p className="mt-3 max-w-xl text-3xl font-bold leading-tight sm:text-5xl">Reportes y rutas en un solo lugar.</p>
          <p className="mt-4 max-w-md text-sm leading-6 text-[var(--admin-muted)]">Revisa avisos de la comunidad, corrige recorridos y consulta su historial de publicación.</p>
        </section>

        <div>
          {access.status === "unconfigured" ? (
            <div className="border border-[#f4c84a]/30 bg-[var(--admin-surface)] p-7">
              <p className="text-xs font-black uppercase text-[#f4c84a]">Configuración pendiente</p>
              <h1 className="mt-3 font-serif text-3xl font-black">Conecta Supabase para continuar.</h1>
              <p className="mt-4 text-sm leading-7 text-[var(--admin-muted)]">Añade las variables indicadas en <code className="text-[var(--brand-white)]">.env.example</code> y ejecuta la migración.</p>
            </div>
          ) : (
            <>
              {access.status === "denied" && <p className="mb-4 border-l-2 border-[#f4c84a] px-4 text-sm text-[#f4df98]">La sesión de {access.email ?? "este usuario"} no está autorizada.</p>}
              {params.error && <p className="mb-4 border-l-2 border-[#f4c84a] px-4 text-sm text-[#f4df98]">{params.error.slice(0, 180)}</p>}
              <AdminLoginForm />
            </>
          )}
        </div>
      </div>
    </main>
  );
}
