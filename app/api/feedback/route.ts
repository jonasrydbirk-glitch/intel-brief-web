import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifySession } from "@/app/lib/session";
import { sendEmail } from "@/lib/delivery";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_KEY ?? "",
  { auth: { persistSession: false } }
);

const VALID_RATINGS = new Set(["good", "ok", "bad"]);

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // ── Brief-feedback mode (email click — no session required) ───────────────
  // Identified by the presence of subscriberId in the payload.
  if (body.subscriberId) {
    const subscriberId = String(body.subscriberId).trim();
    const briefJobId   = body.briefJobId ? String(body.briefJobId).trim() : null;
    const rating       = body.rating ? String(body.rating).trim() : null;
    const message      = body.message ? String(body.message).trim().slice(0, 5000) : null;

    if (rating && !VALID_RATINGS.has(rating)) {
      return NextResponse.json({ error: "Invalid rating" }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const { error: dbError } = await supabaseAdmin.from("feedback").insert({
      id,
      subscriber_id: subscriberId,
      brief_job_id:  briefJobId,
      rating,
      message,
    });

    if (dbError) {
      console.error("[feedback] DB insert failed:", dbError);
      return NextResponse.json({ error: "Failed to save feedback" }, { status: 500 });
    }

    // Look up subscriber name + email for the notification
    const { data: sub } = await supabaseAdmin
      .from("subscribers")
      .select("fullName, email")
      .eq("id", subscriberId)
      .single();

    const subName  = (sub as { fullName?: string } | null)?.fullName ?? subscriberId;
    const subEmail = (sub as { email?: string } | null)?.email ?? "";

    // Admin notification — best-effort, never fails the request
    try {
      const ratingEmoji = rating === "good" ? "👍" : rating === "bad" ? "👎" : "😐";
      await sendEmail({
        to:      "atlas@iqsea.io",
        subject: `Brief feedback from ${subName} — ${ratingEmoji} ${rating ?? "no rating"}`,
        htmlBody: `
          <div style="font-family:sans-serif;color:#e8eef4;background:#0b1424;padding:24px;border-radius:12px;max-width:520px;">
            <h2 style="color:#53b1c1;margin:0 0 16px;">Brief Feedback</h2>
            <p style="margin:0 0 6px;"><strong>From:</strong> ${subName}${subEmail ? ` &lt;${subEmail}&gt;` : ""}</p>
            <p style="margin:0 0 6px;"><strong>Rating:</strong> ${ratingEmoji} ${rating ?? "—"}</p>
            ${briefJobId ? `<p style="margin:0 0 6px;"><strong>Brief job:</strong> <code style="font-size:12px;">${briefJobId}</code></p>` : ""}
            <hr style="border:none;border-top:1px solid #1a3358;margin:16px 0;" />
            ${message
              ? `<p style="white-space:pre-wrap;line-height:1.6;">${message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`
              : `<p style="color:#6b7280;font-style:italic;">No message provided.</p>`}
          </div>
        `,
      });
    } catch (emailErr) {
      console.error("[feedback] Notification email failed (non-fatal):", emailErr);
    }

    return NextResponse.json({ ok: true });
  }

  // ── Legacy session-based feedback (general feedback page, logged-in user) ─
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const message = (body.message ? String(body.message) : "").trim();
  if (!message) {
    return NextResponse.json({ error: "Feedback message is required" }, { status: 400 });
  }
  if (message.length > 5000) {
    return NextResponse.json({ error: "Feedback must be under 5 000 characters" }, { status: 400 });
  }

  const { error: dbError } = await supabaseAdmin.from("feedback").insert({
    id:            crypto.randomUUID(),
    subscriber_id: session.userId ?? "",
    message,
  });

  if (dbError) {
    console.error("[feedback] DB insert failed:", dbError);
    return NextResponse.json({ error: "Failed to save feedback. Please try again." }, { status: 500 });
  }

  try {
    await sendEmail({
      to:      "atlas@iqsea.io",
      subject: `New feedback from ${session.email ?? session.userId}`,
      htmlBody: `
        <div style="font-family:sans-serif;color:#e8eef4;background:#0b1424;padding:24px;border-radius:12px;">
          <h2 style="color:#53b1c1;margin:0 0 16px;">New User Feedback</h2>
          <p style="margin:0 0 8px;"><strong>User:</strong> ${session.email ?? "N/A"}</p>
          <p style="margin:0 0 8px;"><strong>User ID:</strong> ${session.userId}</p>
          <hr style="border:none;border-top:1px solid #1a3358;margin:16px 0;" />
          <p style="white-space:pre-wrap;line-height:1.6;">${message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
        </div>
      `,
    });
  } catch (emailErr) {
    console.error("[feedback] Notification email failed (non-fatal):", emailErr);
  }

  return NextResponse.json({ ok: true });
}
