import { NextResponse } from "next/server";
import { verifySession } from "@/app/lib/session";
import { supabase } from "@/lib/supabase";

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

  const { data, error } = await supabase
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
