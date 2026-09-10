"use client";

import { useEffect } from "react";
import { trackRouteConsultation } from "@/lib/route-consultation-client";

export default function RouteConsultationTracker({ routeKey }: { routeKey: string }) {
  useEffect(() => {
    trackRouteConsultation({ routeKey, source: "route_page" });
  }, [routeKey]);

  return null;
}
