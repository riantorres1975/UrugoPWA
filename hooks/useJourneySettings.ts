"use client";
import { useMemo, useSyncExternalStore } from "react";
import { parseJourneySettings, type JourneySettings } from "@/lib/journey-settings";

const KEY = "urugo:journey-settings:v1";
let memory = "{}";
function snapshot() {
  try { return localStorage.getItem(KEY) ?? memory; } catch { return memory; }
}
function subscribe(callback: () => void) {
  window.addEventListener(KEY, callback);
  window.addEventListener("storage", callback);
  return () => { window.removeEventListener(KEY, callback); window.removeEventListener("storage", callback); };
}
function setSettings(value: JourneySettings) {
  memory = JSON.stringify(parseJourneySettings(value));
  try { localStorage.setItem(KEY, memory); } catch { /* Preserve this session's choice. */ }
  window.dispatchEvent(new Event(KEY));
}
export function useJourneySettings() {
  const raw = useSyncExternalStore(subscribe, snapshot, () => "{}");
  const settings = useMemo(() => {
    try { return parseJourneySettings(JSON.parse(raw)); } catch { return parseJourneySettings(null); }
  }, [raw]);
  return [settings, setSettings] as const;
}
