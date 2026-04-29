import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifySession } from "@/app/lib/session";
import { sendEmail } from "@/lib/delivery";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_KEY ?? "placeholder",
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
      const ratingColor = rating === "good" ? "#2BB3CD" : rating === "bad" ? "#dc2626" : "#64748b";
      await sendEmail({
        to:      "atlas@iqsea.io",
        subject: `Brief feedback from ${subName} — ${ratingEmoji} ${rating ?? "no rating"}`,
        htmlBody: `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8" /></head>
<body style="margin:0;padding:0;background:#050e1c;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#050e1c;">
  <tr>
    <td align="center" style="padding:32px 20px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
        <tr>
          <td align="center" style="padding-bottom:20px;">
            <img src="https://iqsea.io/brand/logo-white-compact.png" height="30" alt="IQSEA" style="display:block;margin:0 auto;" />
          </td>
        </tr>
        <tr>
          <td style="background:#0f1e33;border:1px solid #1d3a5f;border-radius:10px;overflow:hidden;">
            <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="height:3px;background:#2BB3CD;"></td></tr></table>
            <table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 28px;">
              <tr>
                <td style="padding-bottom:16px;border-bottom:1px solid #1d3a5f;">
                  <div style="font-size:15px;font-weight:700;color:#2BB3CD;font-family:Inter,-apple-system,sans-serif;">Brief Feedback</div>
                </td>
              </tr>
              <tr>
                <td style="padding-top:16px;padding-bottom:6px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:5px 0;font-size:13px;font-family:Inter,-apple-system,sans-serif;">
                        <span style="color:#8fa8c4;">From</span>&ensp;<span style="color:#e8eef4;font-weight:600;">${subName}${subEmail ? `&ensp;<span style="color:#5a7a9a;font-weight:400;">&lt;${subEmail.replace(/</g, "&lt;").replace(/>/g, "&gt;")}&gt;</span>` : ""}</span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:5px 0;font-size:13px;font-family:Inter,-apple-system,sans-serif;">
                        <span style="color:#8fa8c4;">Rating</span>&ensp;<span style="color:${ratingColor};font-weight:700;">${ratingEmoji} ${rating ?? "—"}</span>
                      </td>
                    </tr>
                    ${briefJobId ? `<tr><td style="padding:5px 0;font-size:13px;font-family:Inter,-apple-system,sans-serif;"><span style="color:#8fa8c4;">Brief job</span>&ensp;<span style="color:#6bc4d2;font-family:'JetBrains Mono','SF Mono',Consolas,monospace;font-size:12px;">${briefJobId}</span></td></tr>` : ""}
                  </table>
                </td>
              </tr>
              ${message ? `
              <tr>
                <td style="padding-top:16px;">
                  <div style="background:#0B1F38;border-radius:6px;padding:14px 16px;">
                    <div style="font-size:13px;color:#e8eef4;line-height:1.65;white-space:pre-wrap;font-family:Inter,-apple-system,sans-serif;">${message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
                  </div>
                </td>
              </tr>` : `
              <tr>
                <td style="padding-top:16px;">
                  <div style="font-size:13px;color:#5a7a9a;font-style:italic;font-family:Inter,-apple-system,sans-serif;">No message provided.</div>
                </td>
              </tr>`}
            </table>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding-top:18px;">
            <div style="font-size:11px;color:#3a5a7a;font-family:Inter,-apple-system,sans-serif;">IQsea Intel Engine &middot; Internal notification</div>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`,
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
      htmlBody: `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8" /></head>
<body style="margin:0;padding:0;background:#050e1c;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#050e1c;">
  <tr>
    <td align="center" style="padding:32px 20px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
        <tr>
          <td align="center" style="padding-bottom:20px;">
            <img src="https://iqsea.io/brand/logo-white-compact.png" height="30" alt="IQSEA" style="display:block;margin:0 auto;" />
          </td>
        </tr>
        <tr>
          <td style="background:#0f1e33;border:1px solid #1d3a5f;border-radius:10px;overflow:hidden;">
            <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="height:3px;background:#2BB3CD;"></td></tr></table>
            <table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 28px;">
              <tr>
                <td style="padding-bottom:16px;border-bottom:1px solid #1d3a5f;">
                  <div style="font-size:15px;font-weight:700;color:#2BB3CD;font-family:Inter,-apple-system,sans-serif;">New User Feedback</div>
                </td>
              </tr>
              <tr>
                <td style="padding-top:16px;padding-bottom:16px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:5px 0;font-size:13px;font-family:Inter,-apple-system,sans-serif;">
                        <span style="color:#8fa8c4;">User</span>&ensp;<span style="color:#e8eef4;font-weight:600;">${(session.email ?? "N/A").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:5px 0;font-size:13px;font-family:Inter,-apple-system,sans-serif;">
                        <span style="color:#8fa8c4;">User ID</span>&ensp;<span style="color:#6bc4d2;font-family:'JetBrains Mono','SF Mono',Consolas,monospace;font-size:12px;">${session.userId}</span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td>
                  <div style="background:#0B1F38;border-radius:6px;padding:14px 16px;">
                    <div style="font-size:13px;color:#e8eef4;line-height:1.65;white-space:pre-wrap;font-family:Inter,-apple-system,sans-serif;">${message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding-top:18px;">
            <div style="font-size:11px;color:#3a5a7a;font-family:Inter,-apple-system,sans-serif;">IQsea Intel Engine &middot; Internal notification</div>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`,
    });
  } catch (emailErr) {
    console.error("[feedback] Notification email failed (non-fatal):", emailErr);
  }

  return NextResponse.json({ ok: true });
}
