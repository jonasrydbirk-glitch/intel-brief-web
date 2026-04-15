import { NextResponse } from "next/server";
import { customAlphabet } from "nanoid";
import { findUserByEmail, hashPassword } from "@/app/lib/auth";
import { createSession } from "@/app/lib/session";
import { supabase } from "@/lib/supabase";

const nanoid = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 8);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = (body.email ?? "").trim().toLowerCase();
    const password = (body.password ?? "").trim();

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

    // Minimal insert — all non-auth fields use empty-but-valid defaults.
    // The onboarding questionnaire (PATCH /api/onboard/complete) fills them in.
    const { error } = await supabase.from("subscribers").insert({
      id,
      email,
      password_hash,
      fullName: "",
      companyName: "",
      role: "",
      assets: [],
      subjects: [],
      monthlyReview: [],
      modules: {
        tender: { enabled: false },
        prospects: { enabled: false },
        offDuty: { enabled: false },
        marketPulse: { enabled: false },
        regulatoryTimeline: { enabled: false },
        competitorTracker: { enabled: false },
        vesselArrivals: { enabled: false },
        safety: { enabled: false },
        monthlyLeadSummary: { enabled: false },
        monthlyTenderSummary: { enabled: false },
      },
      frequency: "",
      depth: "",
      timezone: "",
      deliveryTime: "",
      tier: "solo",
      created: new Date().toISOString().split("T")[0],
      tweaks_used: 0,
      tweaks_limit: 2,
      onboarding_complete: false,
    });

    if (error) {
      console.error("[signup] Supabase insert error:", JSON.stringify(error));
      return NextResponse.json(
        { error: "Failed to create account", detail: error.message },
        { status: 500 }
      );
    }

    await createSession(id, email);

    return NextResponse.json({ id });
  } catch (err) {
    console.error("[signup] Unhandled error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
