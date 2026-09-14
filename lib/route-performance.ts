import type { RouteCalculationResult } from "@/lib/route-calculation";

export type RouteCalculationEngine = "worker" | "fallback";

export type RouteCalculationPerformance = {
  duration_bucket: "lt_50" | "50_99" | "100_249" | "250_499" | "500_999" | "gte_1000" | "unknown";
  engine: RouteCalculationEngine;
  result_type: "direct" | "transfer" | "none";
  option_count: number;
};

export function getRouteCalculationDurationBucket(
  durationMs: number,
): RouteCalculationPerformance["duration_bucket"] {
  if (!Number.isFinite(durationMs) || durationMs < 0) return "unknown";
  if (durationMs < 50) return "lt_50";
  if (durationMs < 100) return "50_99";
  if (durationMs < 250) return "100_249";
  if (durationMs < 500) return "250_499";
  if (durationMs < 1_000) return "500_999";
  return "gte_1000";
}

export function buildRouteCalculationPerformance(
  result: RouteCalculationResult,
  durationMs: number,
  engine: RouteCalculationEngine,
): RouteCalculationPerformance {
  const resultType = result.recommendedTransfer ? "transfer" : result.suggestions.length > 0
    ? "direct"
    : result.transfers.length > 0
      ? "transfer"
      : "none";
  const optionCount = result.suggestions.length + result.transfers.length;

  return {
    duration_bucket: getRouteCalculationDurationBucket(durationMs),
    engine,
    result_type: resultType,
    option_count: Math.min(5, optionCount),
  };
}
