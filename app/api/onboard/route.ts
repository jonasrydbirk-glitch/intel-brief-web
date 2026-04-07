import { NextResponse } from "next/server";
import { customAlphabet } from "nanoid";
import { findUserByEmail, hashPassword } from "@/app/lib/auth";
import { createSession } from "@/app/lib/session";
import { supabase } from "@/lib/supabase";

const nanoid = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 8);

export async function POST(request: Request) {
  const body = await request.json();

  const email = (body.email || "").trim();
  const password = (body.password || "").trim();

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  if (!password || password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 }
    );
  }

  // Prevent duplicate email registrations
  const existing = await findUserByEmail(email);
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists. Please log in." },
      { status: 409 }
    );
  }

  const id = `sub_${nanoid()}`;
  const password_hash = await hashPassword(password);

  const profile = {
    id,
    email,
    password_hash,
    fullName: (body.fullName || "").trim(),
    companyName: (body.companyName || "").trim(),
    role: body.role || "",
    assets: (body.assets || "")
      .split("\n")
      .map((line: string) => line.trim())
      .filter((line: string) => line.length > 0),
    subjects: (body.subjects || []).filter(
      (s: string) => typeof s === "string" && s.trim().length > 0
    ),
    modules: {
      tender: body.tenderEnabled
        ? { enabled: true, region: body.tenderRegion || "", type: body.tenderType || "" }
        : { enabled: false },
      prospects: body.prospectsEnabled
        ? { enabled: true, perReport: body.prospectsPerReport || 3, focusAreas: body.prospectsFocusAreas || "" }
        : { enabled: false },
      offDuty: body.offDutyEnabled
        ? { enabled: true, interests: body.offDutyInterests || "" }
        : { enabled: false },
      marketPulse: body.marketPulseEnabled
        ? { enabled: true, dataToTrack: body.marketPulseDataToTrack || "" }
        : { enabled: false },
      regulatoryTimeline: body.regulatoryTimelineEnabled
        ? { enabled: true, regulations: body.regulatoryTimelineRegulations || "" }
        : { enabled: false },
      monthlyProspectRollup: body.monthlyProspectRollupEnabled
        ? { enabled: true }
        : { enabled: false },
      competitorTracker: body.competitorTrackerEnabled
        ? { enabled: true, companies: body.competitorTrackerCompanies || "" }
        : { enabled: false },
      vesselArrivals: body.vesselArrivalsEnabled
        ? { enabled: true, port: body.vesselArrivalsPort || "", vesselType: body.vesselArrivalsVesselType || "", timeframe: body.vesselArrivalsTimeframe || "" }
        : { enabled: false },
      safety: body.safetyEnabled
        ? { enabled: true, areas: body.safetyAreas || "" }
        : { enabled: false },
    },
    frequency: body.frequency || "",
    depth: body.depth || "",
    timezone: body.timezone || "",
    deliveryTime: body.deliveryTime || "",
    monthlyReview: (body.monthlyReview || "")
      .split("\n")
      .map((line: string) => line.trim())
      .filter((line: string) => line.length > 0),
    tier: "solo",
    created: new Date().toISOString().split("T")[0],
    tweaks_used: 0,
    tweaks_limit: 2,
  };

  const { error } = await supabase.from("subscribers").insert(profile);

  if (error) {
    return NextResponse.json(
      { error: "Failed to create subscriber" },
      { status: 500 }
    );
  }

  // Auto-login the new user
  await createSession(id, email);

  return NextResponse.json({ id, profileUrl: `/profile/${id}` });
}
