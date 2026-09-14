export type JourneyQualityGroup = {
  route_keys: string[];
  route_names: string[];
  devices: number;
  negative: number;
  active_days: number;
  bus_missing: number;
  route_incorrect: number;
  transfer_far: number;
};
export type JourneyQualitySignal = {
  routeNames: string[];
  concern: "bus_missing" | "route_incorrect" | "transfer_far";
  penalty: number;
};

export type QualityVote = {
  route_keys: string[]; route_names: string[]; device_hash: string;
  useful: boolean; reason: string | null; feedback_day: string; updated_at: string;
};

export function aggregateJourneyQuality(votes: QualityVote[]): JourneyQualityGroup[] {
  const latest = new Map<string, QualityVote>();
  for (const vote of votes) {
    const key = JSON.stringify([vote.route_keys, vote.device_hash]);
    const previous = latest.get(key);
    if (!previous || vote.updated_at > previous.updated_at) latest.set(key, vote);
  }
  const groups = new Map<string, { group: JourneyQualityGroup; days: Set<string> }>();
  for (const vote of latest.values()) {
    const key = JSON.stringify(vote.route_keys);
    const item = groups.get(key) ?? { group: { route_keys: vote.route_keys, route_names: vote.route_names,
      devices: 0, negative: 0, active_days: 0, bus_missing: 0, route_incorrect: 0, transfer_far: 0 }, days: new Set<string>() };
    item.group.devices++;
    item.days.add(vote.feedback_day);
    if (!vote.useful) {
      item.group.negative++;
      if (vote.reason === "bus_missing" || vote.reason === "route_incorrect" || vote.reason === "transfer_far") item.group[vote.reason]++;
    }
    groups.set(key, item);
  }
  return [...groups.values()].map(({ group, days }) => ({ ...group, active_days: days.size }))
    .sort((a, b) => b.negative - a.negative || b.devices - a.devices);
}

export const QUALITY_MESSAGES = {
  bus_missing: "Hay avisos recientes de que el transporte no pasó. Considera también otra opción.",
  route_incorrect: "Hay avisos recientes de cambios en el recorrido. Confirma el destino al subir.",
  transfer_far: "Hay avisos recientes sobre la distancia del transbordo. Revisa el tramo a pie.",
} as const;

// Latest vote per device over 30 days; a repeat daily voter cannot build the sample.
export function qualitySignal(group: JourneyQualityGroup): JourneyQualitySignal | null {
  if (group.devices < 20 || group.active_days < 3 || group.negative / group.devices < 0.6) return null;
  const concerns = ["route_incorrect", "bus_missing", "transfer_far"] as const;
  const concern = [...concerns].sort((a, b) => group[b] - group[a])[0];
  if (group[concern] < 5) return null;
  return { routeNames: group.route_names, concern, penalty: Math.min(2, 1 + (group.negative / group.devices - 0.6) * 2.5) };
}

export function findQualitySignal(signals: JourneyQualitySignal[], names: string[]) {
  return signals.find((signal) => signal.routeNames.length === names.length
    && signal.routeNames.every((name, index) => name.toLocaleLowerCase("es-MX") === names[index].toLocaleLowerCase("es-MX")));
}
