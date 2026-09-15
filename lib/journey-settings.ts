export type JourneySettings = {
  extraMinutes: 5 | 10 | 15;
  maxWalkM: 300 | 500 | 800 | null;
};

export const DEFAULT_JOURNEY_SETTINGS: JourneySettings = { extraMinutes: 5, maxWalkM: null };

export function parseJourneySettings(value: unknown): JourneySettings {
  const raw = value && typeof value === "object" ? value as Partial<JourneySettings> : {};
  return {
    extraMinutes: raw.extraMinutes === 10 || raw.extraMinutes === 15 ? raw.extraMinutes : 5,
    maxWalkM: raw.maxWalkM === 300 || raw.maxWalkM === 500 || raw.maxWalkM === 800 ? raw.maxWalkM : null,
  };
}
