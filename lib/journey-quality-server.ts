import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { aggregateJourneyQuality, type JourneyQualityGroup, type QualityVote } from "@/lib/journey-quality";

let cached: { expires: number; groups: JourneyQualityGroup[] } | null = null;
let pending: Promise<JourneyQualityGroup[]> | null = null;
const PAGE_SIZE = 1000;

async function queryJourneyQuality(): Promise<JourneyQualityGroup[]> {
  const client = createSupabaseAdminClient();
  if (!client) throw new Error("Opiniones no disponibles");
  const until = new Date();
  const from = new Date(until.getTime() - 30 * 86_400_000);
  const votes: QualityVote[] = [];
  const signal = AbortSignal.timeout(5_000);
  for (let offset = 0; offset < 50_000; offset += PAGE_SIZE) {
    const { data, error } = await client.from("journey_feedback")
      .select("route_keys,route_names,device_hash,useful,reason,feedback_day,updated_at")
      .gte("created_at", from.toISOString()).lte("created_at", until.toISOString())
      .order("created_at").order("id").range(offset, offset + PAGE_SIZE - 1).abortSignal(signal);
    if (error || !data) throw new Error("No se pudo consultar la calidad de los viajes");
    votes.push(...data as QualityVote[]);
    if (data.length < PAGE_SIZE) return aggregateJourneyQuality(votes);
  }
  // Never use a truncated sample to penalize a route. Move aggregation to SQL at this volume.
  throw new Error("La muestra supera el límite de agregación");
}

export async function loadJourneyQuality(): Promise<JourneyQualityGroup[]> {
  if (cached && cached.expires > Date.now()) return cached.groups;
  pending ??= queryJourneyQuality().then((groups) => {
    cached = { expires: Date.now() + 5 * 60_000, groups };
    return groups;
  }).finally(() => { pending = null; });
  return pending;
}
