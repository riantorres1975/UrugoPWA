import { ClipboardList, Heart, KeyRound, LogOut, RadioTower, Route, ThumbsUp } from "lucide-react";
import Link from "next/link";
import { signOutAdmin } from "@/app/admin/actions";
import SiteBrand from "@/components/SiteBrand";
import { getAdminPendingCounts } from "@/lib/admin-workload";

type Props = {
  email: string;
  active: "integrations" | "reports" | "routes" | "signals" | "feedback" | "support";
};

function PendingCount({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute right-0.5 top-0.5 inline-grid min-w-4 place-items-center rounded-md bg-[var(--brand-lime)] px-0.5 py-0.5 text-[8px] font-bold tabular-nums text-[var(--brand-deep)] sm:static sm:min-w-5 sm:px-1.5 sm:text-[10px]">
      {count > 99 ? "99+" : count}<span className="sr-only"> pendientes</span>
    </span>
  );
}

export default async function AdminHeader({ email, active }: Props) {
  const pending = await getAdminPendingCounts();
  const pendingReports = pending.reports ?? 0;
  const pendingSignals = pending.signals ?? 0;

  const links = [
    { href: "/admin", id: "reports", label: "Reportes", icon: ClipboardList, count: pendingReports },
    { href: "/admin/routes", id: "routes", label: "Rutas", icon: Route },
    { href: "/admin/signals", id: "signals", label: "Señales", icon: RadioTower, count: pendingSignals },
    { href: "/admin/feedback", id: "feedback", label: "Opiniones", icon: ThumbsUp },
    { href: "/admin/apoyos", id: "support", label: "Apoyos", icon: Heart },
    { href: "/admin/integrations", id: "integrations", label: "Integraciones", icon: KeyRound },
  ];

  return (
    <header className="border-b border-[var(--admin-line)] bg-[var(--brand-header)] px-5 sm:px-8">
      <div className="mx-auto max-w-[1500px] py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <SiteBrand />
            <span className="border-l border-[var(--admin-line)] pl-3 text-xs font-semibold text-[var(--admin-muted)]">Admin</span>
          </div>
          <div className="flex min-w-0 items-center gap-3 text-xs text-[var(--admin-muted)]">
            <span className="hidden max-w-52 truncate sm:inline" title={email}>{email}</span>
            <form action={signOutAdmin}>
              <button aria-label="Cerrar sesión" title="Cerrar sesión" className="admin-button inline-flex h-11 min-w-11 items-center justify-center gap-2 px-3">
                <LogOut className="h-4 w-4" aria-hidden="true" /><span className="hidden font-semibold md:inline">Salir</span>
              </button>
            </form>
          </div>
        </div>
        <nav className="mt-2 grid grid-cols-3 gap-0.5 border-t border-[var(--admin-line)] pt-2 sm:flex sm:flex-wrap sm:gap-1" aria-label="Administración">
          {links.map(({ id, href, label, icon: Icon, count }) => (
            <Link key={id} href={href} aria-current={active === id ? "page" : undefined}
              aria-label={id === "integrations" ? label : undefined}
              className="admin-nav-link relative inline-flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-lg border border-transparent text-[10px] font-bold text-[var(--admin-muted)] hover:text-[var(--brand-white)] sm:min-h-11 sm:flex-row sm:gap-2 sm:px-3 sm:text-xs">
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {id === "integrations" ? <><span className="sm:hidden">API</span><span className="hidden sm:inline">{label}</span></> : label}
              <PendingCount count={count ?? 0} />
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

