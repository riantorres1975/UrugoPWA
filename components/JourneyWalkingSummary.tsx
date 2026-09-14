import type { JourneyCost } from "@/lib/journey-ranking";
import { hasStreetWalking, type JourneyWalking } from "@/lib/journey-walking";
export default function JourneyWalkingSummary({ cost, walking, concern }: { cost?: JourneyCost; walking?: JourneyWalking; concern?: string }) {
  if (!cost) return null;
  const total = Math.round(cost.originWalkM + cost.destinationWalkM + cost.transferWalkM);
  return <div className="ov-pill ov-border mt-3 rounded-xl border px-3 py-2 text-xs leading-6" aria-label="Caminata del viaje">
    <p className="ov-text font-semibold">~{total} m a pie en total · {Math.ceil(cost.walkingMinutes ?? total / 75)} min</p>
    <p className="ov-text-muted">{Math.round(cost.originWalkM)} m para subir{cost.transfers > 0 ? ` · ${Math.round(cost.transferWalkM)} m en el cambio` : ""} · {Math.round(cost.destinationWalkM)} m al bajar</p>
    <p className="ov-text-muted">Espera estimada: ~{Math.ceil(cost.waitMinutes)} min{cost.transfers ? " entre ambos tramos" : ""}.</p>
    <p className="ov-text-muted">{hasStreetWalking(walking) ? "Caminata calculada por calles. Los accesos finales pueden ser aproximados." : walking ? "Caminata aproximada: no pudimos comprobar todos los accesos por calles." : "Caminata estimada en línea recta."}</p>
    {concern && <p className="mt-2 text-amber-300">{concern}</p>}
  </div>;
}
