import { describe, expect, it } from "vitest";
import { matchesPublicRoute } from "@/lib/public-route-search";

describe("búsqueda pública de rutas", () => {
  it("distingue el número completo de prefijos y variantes", () => {
    expect(matchesPublicRoute("1", "Ruta 1 - San José", "Ruta 1 - San José")).toBe(true);
    expect(matchesPublicRoute("ruta 1", "Ruta 176", "Ruta 176 Clínica 76")).toBe(false);
    expect(matchesPublicRoute("1", "Ruta 1A", "Ruta 1A San José")).toBe(false);
    expect(matchesPublicRoute("15a patria", "Ruta 15A", "Ruta 15A Inf. Patria")).toBe(true);
    expect(matchesPublicRoute("15", "Ruta 15A", "Ruta 15A Inf. Patria")).toBe(false);
  });
  it("permite varios términos, acentos y búsquedas por lugares", () => {
    expect(matchesPublicRoute("  76   constituyentes ", "Ruta 76", "Ruta 76 Constituyentes")).toBe(true);
    expect(matchesPublicRoute("san jose", "Ruta 1 - San José", "Ruta 1 - San José")).toBe(true);
    expect(matchesPublicRoute("hospital regional", "Ruta 26", "Ruta 26 Hospital Regional")).toBe(true);
    expect(matchesPublicRoute("76 hospital", "Ruta 76", "Ruta 76 Constituyentes")).toBe(false);
    expect(matchesPublicRoute("", "Ruta 76", "Ruta 76 Constituyentes")).toBe(true);
    expect(matchesPublicRoute("18 de marzo", "Ruta 20", "Ruta 20 colonia 18 de Marzo")).toBe(true);
  });
});
