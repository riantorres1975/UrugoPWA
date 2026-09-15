import { describe, expect, it } from "vitest";
import { parseJourneySettings } from "@/lib/journey-settings";
import { journeyMinutes, rankJourneys, type JourneyCost } from "@/lib/journey-ranking";
import { journeyExplanation } from "@/lib/journey-explanation";

const cost = (walk: number, minutes: number, transfers = 0): JourneyCost => ({
  originWalkM: walk / 2, destinationWalkM: walk / 2, transferWalkM: 0,
  rideMinutes: minutes - walk / 75 - 5, waitMinutes: 5, transfers,
});

describe("ajustes de viaje", () => {
  it("normaliza datos viejos o dañados sin introducir límites inválidos", () => {
    for (const input of [null, "bad", { extraMinutes: -1, maxWalkM: -400 }, { extraMinutes: Infinity, maxWalkM: "300" }]) {
      expect(parseJourneySettings(input)).toEqual({ extraMinutes: 5, maxWalkM: null });
    }
    expect(parseJourneySettings({ extraMinutes: 15, maxWalkM: 800 })).toEqual({ extraMinutes: 15, maxWalkM: 800 });
  });
  it("permite aceptar más tiempo para una caminata menor", () => {
    const fast = { cost: cost(700, 20) }, near = { cost: cost(100, 29) };
    expect(rankJourneys([fast, near], "nearby", { extraMinutes: 5, maxWalkM: null })[0]).toBe(fast);
    expect(rankJourneys([fast, near], "nearby", { extraMinutes: 10, maxWalkM: null })[0]).toBe(near);
    const slower = { cost: cost(0, 34) };
    expect(rankJourneys([fast, slower], "nearby", { extraMinutes: 15, maxWalkM: null })[0]).toBe(slower);
  });
  it.each(["nearby", "balanced", "fastest"] as const)("%s respeta la caminata máxima antes de ordenar por tiempo", (preference) => {
    const fast = { cost: cost(500, 20) }, near = { cost: cost(300, 32) };
    expect(rankJourneys([fast, near], preference, { extraMinutes: 5, maxWalkM: 300 })[0]).toBe(near);
    const explanation = journeyExplanation(fast.cost, [near.cost], { extraMinutes: 5, maxWalkM: 300 });
    expect(explanation.warning).toContain("Hay otra opción que lo cumple");
    expect(explanation.explanation).toContain("pero caminas más de lo que elegiste");
  });
  it("si ninguna cumple, ordena por caminata y lo explica sin prometer un acceso válido", () => {
    const direct = { cost: cost(800, 20) }, transfer = { cost: cost(500, 35, 1) };
    const settings = { extraMinutes: 5, maxWalkM: 300 } as const;
    expect(rankJourneys([direct, transfer], "nearby", settings)[0]).toBe(transfer);
    expect(journeyExplanation(transfer.cost, [direct.cost], settings).warning).toContain("menor caminata disponible es de ~500 m");
  });
  it("explica la diferencia real de caminata y duración", () => {
    const fast = cost(650, 20), near = cost(300, 27);
    const text = journeyExplanation(near, [fast], { extraMinutes: 10, maxWalkM: null });
    expect(text.explanation).toBe("Caminas ~350 m menos y tardas ~7 min más que la opción más rápida.");
    expect(journeyMinutes(near)).toBe(27);
  });
});
