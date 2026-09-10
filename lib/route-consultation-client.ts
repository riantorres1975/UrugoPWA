"use client";

import type { RouteConsultationSource } from "@/lib/route-consultation";

const STORAGE_KEY = "urugo:route-consultations:v1";
const MAX_SAVED_KEYS = 160;
const sentThisSession = new Set<string>();

type TrackRouteConsultationInput = {
  routeKey?: string;
  routeName?: string;
  source: RouteConsultationSource;
};

function consultationKey(input: TrackRouteConsultationInput): string {
  const day = new Date().toISOString().slice(0, 10);
  return `${day}:${input.source}:${input.routeKey ?? input.routeName ?? ""}`;
}

function readSavedKeys(): string[] {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function remember(key: string): boolean {
  if (sentThisSession.has(key)) return false;

  const savedKeys = readSavedKeys();
  if (savedKeys.includes(key)) {
    sentThisSession.add(key);
    return false;
  }

  sentThisSession.add(key);
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([...savedKeys.slice(-(MAX_SAVED_KEYS - 1)), key]),
    );
  } catch {
    // The in-memory key still prevents duplicate requests during this session.
  }
  return true;
}

export function trackRouteConsultation(input: TrackRouteConsultationInput): void {
  if ((!input.routeKey && !input.routeName) || !remember(consultationKey(input))) return;

  void fetch("/api/analytics/route-consultation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    keepalive: true,
  }).catch(() => undefined);
}
