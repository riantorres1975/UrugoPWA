import type { ProductionRoute } from "@/lib/types";

export default function RouteFreshness({ routes }: { routes: ProductionRoute[] }) {
  if (!routes.length) return null;
  return <div className="ov-border border-t px-4 py-3 text-[11px] leading-5" aria-label="Verificación de las rutas">
    {routes.map((route) => {
      const timestamp = route.last_verified_at ? Date.parse(route.last_verified_at) : NaN;
      const date = Number.isFinite(timestamp) ? new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeZone: "America/Mexico_City" }).format(timestamp) : null;
      return <p key={route.id} className="ov-text-muted">{routes.length > 1 ? `${route.name} · ` : ""}{date ? <>Última verificación: <time dateTime={route.last_verified_at!}>{date}</time></> : "Sin fecha de verificación"}</p>;
    })}
  </div>;
}
