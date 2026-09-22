import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import LandingRanking from "@/components/LandingRanking";
import type { TripActivitySummary } from "@/lib/trip-activity";

const fallback = [{ slug: "ruta-17-purhepechas", name: "Ruta 17", destination: "Purépechas" }];
const activity: TripActivitySummary = {
  day: "2026-09-21", updatedAt: "2026-09-21T22:00:00Z", today: { started: 8, arrived: 3, routes: 4 }, weeklyTrips: 30,
  routes: [17, 45, 50, 85].map((n, i) => ({ slug: `ruta-${n}`, name: `Ruta ${n}`, destination: null, started: 15 - i * 3, previous: i === 0 ? 10 : 0 })),
  transfers: [{ names: ["Ruta 17", "Ruta 45"], positive: 9, total: 10 }],
};
function render(data: TripActivitySummary | null) {
  return renderToStaticMarkup(createElement(LandingRanking, { routes: fallback, basedOnUsage: true, activity: data }));
}
describe("actividad en portada", () => {
  it("conserva consultas si falta conexión o una muestra suficiente", () => {
    expect(render(null)).toContain("Rutas más consultadas");
    expect(render({ ...activity, weeklyTrips: 3 })).toContain("Rutas más consultadas");
    expect(render({ ...activity, routes: activity.routes.slice(0, 2) })).toContain("Rutas más consultadas");
  });
  it("muestra inicios, llegadas y tendencias sin llamarlos pasajeros", () => {
    const html = render(activity);
    expect(html).toContain("Rutas con más viajes iniciados");
    expect(html).toContain("Llegadas confirmadas");
    expect(html).toContain("5 más que los 7 días anteriores");
    expect(html).toContain("--activity-width:100%");
    expect(html).toContain("90% lo encontró útil · 10 respuestas");
    expect(html).not.toContain("viajando ahora");
  });
});
