import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifySession } from "@/app/lib/session";
import { getSupabaseUrl } from "@/lib/supabase";

// NOTE: SUPABASE_SERVICE_KEY must be set as a Vercel environment variable
// (not prefixed with NEXT_PUBLIC_) for this route to work in production.
// The anon key is blocked by RLS on the reports table — service key bypasses
// it while the explicit .eq("user_id") filter below preserves per-user isolation.
const supabaseAdmin = createClient(
  getSupabaseUrl() || "https://placeholder.supabase.co" || "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_KEY ?? "placeholder"
);

/**
 * GET /api/reports
 *
 * Returns the authenticated user's report history from the `reports` table,
 * ordered by most recent first.
 */
export async function GET() {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from("reports")
    .select("id, user_id, type, status, subject, generated_at, pdf_url")
    .eq("user_id", session.userId)
    .order("generated_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json(data ?? []);
}
