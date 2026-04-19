import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifySession } from "@/app/lib/session";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_KEY ?? "",
  { auth: { persistSession: false } }
);

export async function GET() {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from("subscribers")
    .select("*")
    .eq("id", session.userId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Subscriber not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const id = body.id;
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  if (id !== session.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Fetch current profile
  const { data: profile, error: fetchError } = await supabaseAdmin
    .from("subscribers")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !profile) {
    return NextResponse.json({ error: "Subscriber not found" }, { status: 404 });
  }

  // Build update object
  const updates: Record<string, unknown> = {};

  if (body.fullName !== undefined) updates.fullName = body.fullName;
  if (body.companyName !== undefined) updates.companyName = body.companyName;
  if (body.role !== undefined) updates.role = body.role;
  if (body.assets !== undefined) {
    updates.assets = body.assets
      .split("\n")
      .map((l: string) => l.trim())
      .filter((l: string) => l.length > 0);
  }
  if (body.subjects !== undefined) {
    updates.subjects = body.subjects.filter(
      (s: string) => typeof s === "string" && s.trim().length > 0
    );
  }
  if (body.frequency !== undefined) updates.frequency = body.frequency;
  if (body.depth !== undefined) updates.depth = body.depth;
  if (body.timezone !== undefined) updates.timezone = body.timezone;
  if (body.deliveryTime !== undefined) updates.deliveryTime = body.deliveryTime;
  if (body.monthlyReview !== undefined) {
    updates.monthlyReview = body.monthlyReview
      .split("\n")
      .map((l: string) => l.trim())
      .filter((l: string) => l.length > 0);
  }
  if (body.monthlyReviewDay !== undefined) updates.monthlyReviewDay = String(body.monthlyReviewDay);
  if (body.monthlyReviewTime !== undefined) updates.monthlyReviewTime = body.monthlyReviewTime;

  // Module updates
  const hasModuleUpdate = [
    "tenderEnabled", "prospectsEnabled", "offDutyEnabled",
    "marketPulseEnabled", "regulatoryTimelineEnabled",
    "monthlyLeadSummaryEnabled", "monthlyTenderSummaryEnabled",
    "competitorTrackerEnabled", "vesselArrivalsEnabled", "safetyEnabled",
  ].some((key) => body[key] !== undefined);

  if (hasModuleUpdate) {
    const modules = { ...profile.modules };
    if (body.tenderEnabled !== undefined) {
      modules.tender = body.tenderEnabled
        ? { enabled: true, region: body.tenderRegion || "", type: body.tenderType || "" }
        : { enabled: false };
    }
    if (body.prospectsEnabled !== undefined) {
      modules.prospects = body.prospectsEnabled
        ? {
            enabled: true,
            perReport: body.prospectsPerReport || 3,
            focusAreas: body.prospectsFocusAreas || "",
          }
        : { enabled: false };
    }
    if (body.offDutyEnabled !== undefined) {
      modules.offDuty = body.offDutyEnabled
        ? { enabled: true, interests: body.offDutyInterests || "" }
        : { enabled: false };
    }
    if (body.marketPulseEnabled !== undefined) {
      modules.marketPulse = body.marketPulseEnabled
        ? { enabled: true, dataToTrack: body.marketPulseDataToTrack || "" }
        : { enabled: false };
    }
    if (body.regulatoryTimelineEnabled !== undefined) {
      modules.regulatoryTimeline = body.regulatoryTimelineEnabled
        ? { enabled: true, regulations: body.regulatoryTimelineRegulations || "" }
        : { enabled: false };
    }
    if (body.monthlyLeadSummaryEnabled !== undefined) {
      modules.monthlyLeadSummary = body.monthlyLeadSummaryEnabled
        ? { enabled: true }
        : { enabled: false };
    }
    if (body.monthlyTenderSummaryEnabled !== undefined) {
      modules.monthlyTenderSummary = body.monthlyTenderSummaryEnabled
        ? { enabled: true }
        : { enabled: false };
    }
    if (body.competitorTrackerEnabled !== undefined) {
      modules.competitorTracker = body.competitorTrackerEnabled
        ? { enabled: true, companies: body.competitorTrackerCompanies || "" }
        : { enabled: false };
    }
    if (body.vesselArrivalsEnabled !== undefined) {
      modules.vesselArrivals = body.vesselArrivalsEnabled
        ? { enabled: true, port: body.vesselArrivalsPort || "", vesselType: body.vesselArrivalsVesselType || "", timeframe: body.vesselArrivalsTimeframe || "" }
        : { enabled: false };
    }
    if (body.safetyEnabled !== undefined) {
      modules.safety = body.safetyEnabled
        ? { enabled: true, areas: body.safetyAreas || "" }
        : { enabled: false };
    }
    updates.modules = modules;
  }

  const { error: updateError } = await supabaseAdmin
    .from("subscribers")
    .update(updates)
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: "Failed to update subscriber" }, { status: 500 });
  }

  return NextResponse.json({ success: true, id });
}
