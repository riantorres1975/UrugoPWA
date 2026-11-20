import { unstable_cache } from "next/cache";
import { getAdminSupabaseConfig } from "@/lib/supabase/config";

export const PUBLISHED_ROUTES_CACHE_TAG = "urugo-published-routes";
export const JOURNEY_QUALITY_CACHE_TAG = "urugo-journey-quality";

/** Cache public projections only. Never use for auth, private reports or mutations. */
export function cachePublicData<T>(tag: string, load: () => Promise<T>, seconds = 300): () => Promise<T> {
  const pending = new Map<string, Promise<T>>();
  return () => {
    const project = getAdminSupabaseConfig()?.url;
    const scope = project ?? "unconfigured";
    const current = pending.get(scope);
    if (current) return current;
    // Keep tests/local static fallback independent from Next's request cache.
    // Configured projects use the shared Data Cache, not just serverless memory.
    const read = project
      ? unstable_cache(load, [tag, project], { revalidate: seconds, tags: [tag] })
      : load;
    const request = read().finally(() => { pending.delete(scope); });
    pending.set(scope, request);
    return request;
  };
}
