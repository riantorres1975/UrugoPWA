import { NextRequest } from "next/server";
import { getAdminAccess } from "@/lib/admin-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { isSameOriginRequest } from "@/lib/request-security";

export async function GET(request: NextRequest) {
  const headers = { "Cache-Control": "private, no-store" };
  if (!isSameOriginRequest(request)) return new Response(null, { status: 403, headers });
  const access = await getAdminAccess();
  if (access.status !== "admin") return new Response(null, { status: 403, headers });
  const db = createSupabaseAdminClient();
  if (!db) return new Response(null, { status: 503, headers });
  const { data, error, count } = await db.from("support_contributions").select("updated_at", { count: "exact" })
    .or("status.eq.pending,and(status.eq.confirmed,publication_status.eq.pending)").order("updated_at", { ascending: false }).limit(1).abortSignal(AbortSignal.timeout(5000));
  if (error) return new Response(null, { status: 503, headers });
  return Response.json({ count: count ?? 0, latest: data?.[0]?.updated_at ?? null }, { headers });
}
