import type { CSSProperties } from "react";
import { publicRouteNumber } from "@/lib/public-route-search";

export default function TransportRouteBadge({ name, color }: { name: string; color: string }) {
  return <span className="transport-route-badge" style={{ "--route-color": color } as CSSProperties} aria-hidden="true">{publicRouteNumber(name)}</span>;
}
