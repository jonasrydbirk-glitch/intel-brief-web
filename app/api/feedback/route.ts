import { NextResponse } from "next/server";
import { verifySession } from "@/app/lib/session";
import { supabase } from "@/lib/supabase";
import { sendEmail } from "@/lib/delivery";

export async function POST(req: Request) {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { message?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const message = (body.message ?? "").trim();
  if (!message) {
    return NextResponse.json(
      { error: "Feedback message is required" },
      { status: 400 }
    );
  }

  if (message.length > 5000) {
    return NextResponse.json(
      { error: "Feedback must be under 5 000 characters" },
      { status: 400 }
    );
  }

  // Persist to Supabase
  const { error: dbError } = await supabase.from("feedback").insert({
    user_id: session.userId,
    message,
  });

  if (dbError) {
    console.error("Failed to save feedback:", dbError);
    return NextResponse.json(
      { error: "Failed to save feedback. Please try again." },
      { status: 500 }
    );
  }

  // Notify admin (best-effort — don't fail the request if email fails)
  try {
    await sendEmail({
      to: "atlas@iqsea.io",
      from: "noreply@iqsea.io",
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
    console.error("Failed to send feedback notification email:", emailErr);
  }

  return NextResponse.json({ ok: true });
}
