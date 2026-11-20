import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { aggregateJourneyQuality, type JourneyQualityGroup, type QualityVote } from "@/lib/journey-quality";
import { cachePublicData, JOURNEY_QUALITY_CACHE_TAG } from "@/lib/public-data-cache";

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

// Cache only the aggregate, never the per-device votes downloaded above.
const readQuality = cachePublicData(JOURNEY_QUALITY_CACHE_TAG, queryJourneyQuality);

export async function loadJourneyQuality(): Promise<JourneyQualityGroup[]> {
  return readQuality();
}
