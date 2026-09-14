"use client";
import { useSyncExternalStore } from "react";
import type { JourneyPreference } from "@/lib/journey-ranking";
let memory: JourneyPreference = "nearby";
function snapshot(): JourneyPreference {
  try {
    const value = localStorage.getItem("urugo:journey-preference:v1");
    if (value === "nearby" || value === "balanced" || value === "fastest") return value;
  } catch { /* Use the in-memory choice if storage is unavailable. */ }
  return memory;
}
function subscribe(callback: () => void) {
  window.addEventListener("urugo:journey-preference", callback);
  window.addEventListener("storage", callback);
  return () => { window.removeEventListener("urugo:journey-preference", callback); window.removeEventListener("storage", callback); };
}
function setPreference(value: JourneyPreference) {
  memory = value;
  try { localStorage.setItem("urugo:journey-preference:v1", value); } catch { /* Keep this choice for the session. */ }
  window.dispatchEvent(new Event("urugo:journey-preference"));
}
export function useJourneyPreference() {
  return [useSyncExternalStore(subscribe, snapshot, () => "nearby" as const), setPreference] as const;
}
