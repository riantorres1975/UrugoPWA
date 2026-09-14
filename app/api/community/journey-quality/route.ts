import { qualitySignal } from "@/lib/journey-quality";
import { loadJourneyQuality } from "@/lib/journey-quality-server";

// This endpoint publishes thresholded signals only, never votes, hashes or locations.
export async function GET() {
  try {
    const groups = await loadJourneyQuality();
    const signals = groups.flatMap((group) => { const signal = qualitySignal(group); return signal ? [signal] : []; });
    return Response.json({ signals }, { headers: { "Cache-Control": "public, max-age=60, s-maxage=300" } });
  } catch {
    return Response.json({ signals: [] }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
