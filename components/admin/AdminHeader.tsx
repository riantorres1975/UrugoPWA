import { ClipboardList, KeyRound, LogOut, RadioTower, Route, ThumbsUp } from "lucide-react";
import Link from "next/link";
import { signOutAdmin } from "@/app/admin/actions";
import SiteBrand from "@/components/SiteBrand";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

type Props = {
  email: string;
  active: "integrations" | "reports" | "routes" | "signals" | "feedback";
};

function PendingCount({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="inline-grid min-w-5 place-items-center bg-[var(--brand-lime)] px-1.5 py-0.5 text-[10px] font-black tabular-nums text-[#0c110a]">
      {count > 99 ? "99+" : count}<span className="sr-only"> pendientes</span>
    </span>
  );
}

export default async function AdminHeader({ email, active }: Props) {
  const supabase = createSupabaseAdminClient();
  const [reportsResult, signalsResult] = supabase
    ? await Promise.all([
        supabase.from("community_reports").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("route_confirmations").select("id", { count: "exact", head: true }).eq("status", "pending"),
      ])
    : [{ count: 0 }, { count: 0 }];
  const pendingReports = reportsResult.count ?? 0;
  const pendingSignals = signalsResult.count ?? 0;

  const linkClass = (selected: boolean) => `inline-flex min-h-11 items-center gap-2 rounded-lg border px-3 text-xs font-bold transition ${
    selected
      ? "border-[#6aab48]/50 bg-[#6aab48]/10 text-[#dceaca]"
      : "border-transparent text-[var(--admin-muted)] hover:border-white/10 hover:text-[#dceaca]"
  }`;

  return (
    <header className="border-b border-[var(--admin-line)] bg-[var(--brand-header)] px-5 sm:px-8">
      <div className="mx-auto flex min-h-16 max-w-[1500px] flex-wrap items-center justify-between gap-3 py-3">
        <div className="flex items-center gap-4">
          <SiteBrand />
          <span className="hidden border-l border-white/10 pl-4 text-xs font-black uppercase text-[var(--admin-muted)] sm:block">Control de datos</span>
        </div>

        <nav className="order-3 flex w-full gap-1 overflow-x-auto border-t border-white/[0.06] pt-3 sm:order-none sm:w-auto sm:border-0 sm:pt-0" aria-label="Administración">
          <Link href="/admin" className={linkClass(active === "reports")} aria-current={active === "reports" ? "page" : undefined}>
            <ClipboardList className="h-4 w-4" aria-hidden="true" /> Reportes <PendingCount count={pendingReports} />
          </Link>
          <Link href="/admin/routes" className={linkClass(active === "routes")} aria-current={active === "routes" ? "page" : undefined}>
            <Route className="h-4 w-4" aria-hidden="true" /> Rutas
          </Link>
          <Link href="/admin/signals" className={linkClass(active === "signals")} aria-current={active === "signals" ? "page" : undefined}>
            <RadioTower className="h-4 w-4" aria-hidden="true" /> Señales <PendingCount count={pendingSignals} />
          </Link>
          <Link href="/admin/feedback" className={linkClass(active === "feedback")} aria-current={active === "feedback" ? "page" : undefined}>
            <ThumbsUp className="h-4 w-4" aria-hidden="true" /> Opiniones
          </Link>
          <Link href="/admin/integrations" className={linkClass(active === "integrations")} aria-current={active === "integrations" ? "page" : undefined}>
            <KeyRound className="h-4 w-4" aria-hidden="true" /> Integraciones
          </Link>
        </nav>

        <div className="flex items-center gap-3 text-xs text-[var(--admin-muted)]">
          <span className="hidden max-w-52 truncate lg:inline">{email}</span>
          <form action={signOutAdmin}>
            <button aria-label="Cerrar sesión" title="Cerrar sesión" className="grid h-9 w-9 place-items-center border border-white/10 transition hover:border-[#6aab48]/60 hover:text-[var(--brand-white)]">
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}

