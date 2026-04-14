import { NextResponse } from "next/server";
import { verifySession } from "@/app/lib/session";
import { supabase } from "@/lib/supabase";

export async function PATCH(request: Request) {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const patch = {
      fullName: (body.fullName ?? "").trim(),
      companyName: (body.companyName ?? "").trim(),
      role: body.role ?? "",
      assets: (body.assets ?? "")
        .split("\n")
        .map((line: string) => line.trim())
        .filter((line: string) => line.length > 0),
      subjects: (body.subjects ?? []).filter(
        (s: string) => typeof s === "string" && s.trim().length > 0
      ),
      modules: {
        tender: body.tenderEnabled
          ? { enabled: true, region: body.tenderRegion ?? "", type: body.tenderType ?? "" }
          : { enabled: false },
        prospects: body.prospectsEnabled
          ? { enabled: true, perReport: body.prospectsPerReport ?? 3, focusAreas: body.prospectsFocusAreas ?? "" }
          : { enabled: false },
        offDuty: body.offDutyEnabled
          ? { enabled: true, interests: body.offDutyInterests ?? "" }
          : { enabled: false },
        marketPulse: body.marketPulseEnabled
          ? { enabled: true, dataToTrack: body.marketPulseDataToTrack ?? "" }
          : { enabled: false },
        regulatoryTimeline: body.regulatoryTimelineEnabled
          ? { enabled: true, regulations: body.regulatoryTimelineRegulations ?? "" }
          : { enabled: false },
        monthlyProspectRollup: body.monthlyProspectRollupEnabled
          ? { enabled: true }
          : { enabled: false },
        competitorTracker: body.competitorTrackerEnabled
          ? { enabled: true, companies: body.competitorTrackerCompanies ?? "" }
          : { enabled: false },
        vesselArrivals: body.vesselArrivalsEnabled
          ? { enabled: true, port: body.vesselArrivalsPort ?? "", vesselType: body.vesselArrivalsVesselType ?? "", timeframe: body.vesselArrivalsTimeframe ?? "" }
          : { enabled: false },
        safety: body.safetyEnabled
          ? { enabled: true, areas: body.safetyAreas ?? "" }
          : { enabled: false },
      },
      frequency: body.frequency ?? "",
      depth: body.depth ?? "",
      timezone: body.timezone ?? "",
      deliveryTime: body.deliveryTime ?? "",
      monthlyReview: (body.monthlyReview ?? "")
        .split("\n")
        .map((line: string) => line.trim())
        .filter((line: string) => line.length > 0),
      onboarding_complete: true,
    };

    const { error } = await supabase
      .from("subscribers")
      .update(patch)
      .eq("id", session.userId);

    if (error) {
      console.error("[onboard/complete] Supabase update error:", JSON.stringify(error));
      return NextResponse.json(
        { error: "Failed to save profile", detail: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[onboard/complete] Unhandled error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
