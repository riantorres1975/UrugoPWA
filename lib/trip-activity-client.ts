"use client";

import type { TripActivityEvent } from "@/lib/trip-activity";

const KEY = "urugo-trip-activity-outbox-v1";
const MAX_AGE = 24 * 60 * 60 * 1000;
let queue: TripActivityEvent[] | null = null;
let pending: Promise<void> | null = null;

function readQueue(): TripActivityEvent[] {
  if (queue) return queue;
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    queue = Array.isArray(raw) ? raw.filter((v): v is TripActivityEvent => !!v && typeof v === "object"
      && typeof v.id === "string" && typeof v.startedAt === "string" && typeof v.arrived === "boolean"
      && Array.isArray(v.routes) && v.routes.length <= 2 && v.routes.every((r: unknown) => typeof r === "string")
      && Date.parse(v.startedAt) > Date.now() - MAX_AGE).slice(-20) : [];
  } catch { queue = []; }
  return queue;
}

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(queue)); } catch { /* In-memory retry remains available. */ }
}

export function flushTripActivity(): Promise<void> {
  if (pending) return pending;
  pending = (async () => {
    queue = readQueue().filter((event) => Date.parse(event.startedAt) > Date.now() - MAX_AGE);
    persist();
    // Drain a confirmation added while its start was in flight, even after the panel closes.
    for (let attempt = 0; attempt < 20 && queue.length; attempt++) {
      const event: TripActivityEvent = queue[0];
      try {
        const response = await fetch("/api/analytics/trip-activity", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(event), keepalive: true,
          signal: AbortSignal.timeout(8_000),
        });
        if (!response.ok && response.status !== 400) break;
        // A confirmation may have replaced the pending start while fetch was in flight.
        queue = readQueue().filter((item) => item !== event);
        persist();
      } catch { break; }
    }
  })().finally(() => { pending = null; });
  return pending;
}

export function enqueueTripActivity(event: TripActivityEvent) {
  const existing = readQueue().find((item) => item.id === event.id);
  queue = [...readQueue().filter((item) => item.id !== event.id), { ...event, arrived: event.arrived || !!existing?.arrived }].slice(-20);
  persist();
  void flushTripActivity();
}
