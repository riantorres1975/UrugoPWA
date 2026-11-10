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

      <div className="mx-auto grid max-w-6xl gap-12 py-16 lg:grid-cols-[1fr_430px] lg:items-center lg:py-24">
        <section>
          <p className="text-xs font-black uppercase text-[var(--brand-lime)]">Administración privada</p>
          <h2 className="mt-5 max-w-2xl font-serif text-5xl font-black leading-[0.98] sm:text-6xl">Aquí se revisa <em className="text-[var(--brand-lime)]">antes de publicar.</em></h2>
          <p className="mt-6 max-w-xl text-base leading-8 text-[var(--admin-muted)]">Los reportes de la comunidad se comparan con el recorrido actual. Ninguna confirmación modifica por sí sola lo que ven los usuarios.</p>
          <div className="mt-10 grid max-w-xl grid-cols-3 border-y border-[var(--admin-line)] py-5 text-xs text-[var(--admin-muted)]">
            <span>Recibir</span><span>Comprobar</span><span>Publicar</span>
          </div>
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
