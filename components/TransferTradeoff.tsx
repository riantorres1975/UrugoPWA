import type { RouteOption } from "@/lib/route-calculation";
import type { TransferOption } from "@/lib/transfers";
import { compareJourneys } from "@/lib/journey-comparison";

export default function TransferTradeoff({ transfer, direct }: { transfer: TransferOption; direct?: RouteOption | null }) {
  if (!direct) return null;
  const differences = compareJourneys(
    { names: [direct.ruta], cost: direct.cost, minutes: direct.estimatedMinutes },
    { names: [transfer.routeAName, transfer.routeBName], cost: transfer.cost, minutes: transfer.estimatedMinutes },
  ).filter((text) => text !== "Añades un transbordo");
  return (
    <span className="map-tradeoff mt-2 block rounded-lg px-2.5 py-2 text-[13px] leading-5">
      <span className="block font-semibold">Frente a la opción directa</span>
      {differences.join(" · ")}
    </span>
  );
}
