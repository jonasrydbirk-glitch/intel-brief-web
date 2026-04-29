import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_KEY ?? "placeholder",
  { auth: { persistSession: false } }
);

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.subscriberId !== "string" || !body.subscriberId.trim()) {
    return NextResponse.json({ error: "subscriberId is required" }, { status: 400 });
  }

  const { subscriberId, action } = body as { subscriberId: string; action: string };

  if (action !== "pause" && action !== "delete") {
    return NextResponse.json({ error: "action must be pause or delete" }, { status: 400 });
  }

  // Verify subscriber exists before acting
  const { data: sub, error: fetchErr } = await supabaseAdmin
    .from("subscribers")
    .select("id")
    .eq("id", subscriberId)
    .single();

  if (fetchErr || !sub) {
    return NextResponse.json({ error: "Subscriber not found" }, { status: 404 });
  }

  if (action === "pause") {
    const { error } = await supabaseAdmin
      .from("subscribers")
      .update({ paused: true })
      .eq("id", subscriberId);

    if (error) {
      return NextResponse.json({ error: "Failed to pause subscription" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  // action === "delete" — remove all subscriber data
  await Promise.all([
    supabaseAdmin.from("sent_articles").delete().eq("subscriber_id", subscriberId),
    supabaseAdmin.from("feedback").delete().eq("subscriber_id", subscriberId),
    supabaseAdmin.from("brief_jobs").delete().eq("subscriber_id", subscriberId),
  ]);

  const { error: deleteErr } = await supabaseAdmin
    .from("subscribers")
    .delete()
    .eq("id", subscriberId);

  if (deleteErr) {
    return NextResponse.json({ error: "Failed to delete subscription" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
