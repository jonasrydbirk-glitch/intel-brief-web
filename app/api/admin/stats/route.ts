import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const { data: subscribers, error } = await supabase
    .from("subscribers")
    .select("*")
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
