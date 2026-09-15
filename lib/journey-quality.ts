export type JourneyQualityGroup = {
  route_keys: string[];
  route_names: string[];
  devices: number;
  negative: number;
  active_days: number;
  bus_missing: number;
  route_incorrect: number;
  transfer_far: number;
  boarding_far?: number;
  alighting_far?: number;
  walking_blocked?: number;
};
export type JourneyQualitySignal = {
  routeNames: string[];
  concern: keyof typeof QUALITY_MESSAGES;
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
      devices: 0, negative: 0, active_days: 0, bus_missing: 0, route_incorrect: 0, transfer_far: 0, boarding_far: 0, alighting_far: 0, walking_blocked: 0 }, days: new Set<string>() };
    item.group.devices++;
    item.days.add(vote.feedback_day);
    if (!vote.useful) {
      item.group.negative++;
      if (vote.reason && Object.hasOwn(QUALITY_MESSAGES, vote.reason)) {
        const reason = vote.reason as keyof typeof QUALITY_MESSAGES;
        item.group[reason] = (item.group[reason] ?? 0) + 1;
      }
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
  boarding_far: "Hay avisos recientes de subidas lejanas. Revisa cómo llegar al camión.",
  alighting_far: "Hay avisos recientes de bajadas lejanas. Revisa cómo llegar al destino.",
  walking_blocked: "Hay avisos recientes de accesos peatonales bloqueados. Considera otra opción y revisa el trayecto.",
} as const;

export const QUALITY_REVIEW_ACTIONS: Record<keyof typeof QUALITY_MESSAGES, string> = {
  transfer_far: "Revisa el enlace peatonal y los puntos de cambio.",
  bus_missing: "Comprueba frecuencia, horario y continuidad del servicio.",
  route_incorrect: "Contrasta el trazado con el recorrido actual antes de editarlo.",
  boarding_far: "Revisa los puntos de subida y los accesos a pie desde el origen.",
  alighting_far: "Revisa los puntos de bajada y la caminata hasta el destino.",
  walking_blocked: "Comprueba barreras, cruces y accesos peatonales antes de modificar el trazado.",
};

// Latest vote per device over 30 days; a repeat daily voter cannot build the sample.
export function qualitySignal(group: JourneyQualityGroup): JourneyQualitySignal | null {
  if (group.devices < 20 || group.active_days < 3 || group.negative / group.devices < 0.6) return null;
  const concerns = ["walking_blocked", "route_incorrect", "bus_missing", "transfer_far", "boarding_far", "alighting_far"] as const;
  const concern = [...concerns].sort((a, b) => (group[b] ?? 0) - (group[a] ?? 0))[0];
  if ((group[concern] ?? 0) < 5) return null;
  return { routeNames: group.route_names, concern, penalty: Math.min(2, 1 + (group.negative / group.devices - 0.6) * 2.5) };
}

export function findQualitySignal(signals: JourneyQualitySignal[], names: string[]) {
  return signals.find((signal) => signal.routeNames.length === names.length
    && signal.routeNames.every((name, index) => name.toLocaleLowerCase("es-MX") === names[index].toLocaleLowerCase("es-MX")));
}
