import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co",
    process.env.SUPABASE_SERVICE_KEY ?? "placeholder",
    { auth: { persistSession: false } }
  );

  const { data: subscribers, error } = await supabaseAdmin
    .from("subscribers")
    .select("id, email, fullName, companyName, role, frequency, depth, timezone, deliveryTime, onboarding_complete, created, modules")
    .order("created", { ascending: false });

  if (error) {
    return NextResponse.json({ subscribers: [], total: 0, moduleStats: {} });
  }

  const list = subscribers || [];
  const total = list.length;

  const moduleKeys = [
    "tender",
    "prospects",
    "marketPulse",
    "offDuty",
    "regulatoryTimeline",
    "competitorTracker",
    "safety",
  ] as const;

  const moduleStats: Record<string, number> = {};
  for (const key of moduleKeys) {
    moduleStats[key] = list.filter((s: Record<string, unknown>) => {
      const modules = s.modules;
      if (!modules || typeof modules !== "object") return false;
      const mod = (modules as Record<string, unknown>)[key];
      if (!mod || typeof mod !== "object") return false;
      return (mod as Record<string, unknown>).enabled === true;
    }).length;
  }

  return NextResponse.json({
    subscribers: list,
    total,
    moduleStats,
  });
}
