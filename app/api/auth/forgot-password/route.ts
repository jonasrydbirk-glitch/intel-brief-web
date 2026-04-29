import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { findUserByEmail } from "@/app/lib/auth";
import { supabase } from "@/lib/supabase";
import { sendEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
  const { email } = await request.json();

  if (!email) {
    return NextResponse.json(
      { error: "Email is required" },
      { status: 400 }
    );
  }

  // Always return success to prevent email enumeration
  const successResponse = NextResponse.json({ success: true });

  console.log("[forgot-password] Incoming request for email:", email);

  const user = await findUserByEmail(email);
  if (!user) {
    console.warn("[forgot-password] No user found for email:", email, "— aborting (no email sent)");
    return successResponse;
  }

  const userId = user.data.id as string;
  const dbEmail = user.data.email as string;
  console.log("[forgot-password] User found — id:", userId, "dbEmail:", dbEmail);
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

  // Delete any existing tokens for this user
  await supabase
    .from("password_reset_tokens")
    .delete()
    .eq("user_id", userId);

  // Insert new token
  const { data: insertData, error: insertError } = await supabase
    .from("password_reset_tokens")
    .insert({ user_id: userId, token, expires_at: expiresAt })
    .select("id")
    .single();

  if (insertError) {
    console.error("[forgot-password] Failed to store reset token:", insertError);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
  console.log("[forgot-password] Token stored in DB, row id:", insertData?.id);

  // Send reset email
  const resetUrl = `${process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"}/reset-password?token=${token}`;

  try {
    console.log("[forgot-password] Sending reset email to:", email, "via Resend/Graph...");
    const emailResult = await sendEmail({
      to: email,
      from: "noreply@iqsea.io",
      subject: "Reset your IQsea password",
      html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#050e1c;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#050e1c;min-height:100vh;">
  <tr>
    <td align="center" style="padding:48px 20px 40px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

        <!-- Logo -->
        <tr>
          <td align="center" style="padding-bottom:28px;">
            <img src="https://iqsea.io/brand/logo-white-compact.png" height="36" alt="IQSEA" style="display:block;margin:0 auto;" />
          </td>
        </tr>

        <!-- Card -->
        <tr>
          <td style="background:#0f1e33;border:1px solid #1d3a5f;border-radius:12px;overflow:hidden;">
            <!-- Card accent bar -->
            <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="height:3px;background:#2BB3CD;"></td></tr></table>
            <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px;">
              <tr>
                <td style="padding-bottom:8px;">
                  <div style="font-size:20px;font-weight:700;color:#e8eef4;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;line-height:1.2;">Reset your password</div>
                </td>
              </tr>
              <tr>
                <td style="padding-bottom:28px;">
                  <div style="font-size:14px;color:#8fa8c4;line-height:1.65;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                    We received a request to reset the password for your IQsea account. Click the button below to choose a new password. This link expires in <strong style="color:#e8eef4;">1 hour</strong>.
                  </div>
                </td>
              </tr>
              <tr>
                <td align="center" style="padding-bottom:28px;">
                  <a href="${resetUrl}" style="display:inline-block;background:#2BB3CD;color:#0B1F38;font-weight:700;font-size:15px;text-decoration:none;padding:14px 40px;border-radius:100px;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">Reset Password</a>
                </td>
              </tr>
              <tr>
                <td>
                  <div style="background:#0B1F38;border-radius:6px;padding:12px 14px;margin-bottom:20px;">
                    <div style="font-size:10px;color:#5a7a9a;text-transform:uppercase;letter-spacing:0.1em;font-family:Inter,-apple-system,sans-serif;margin-bottom:5px;">Reset link</div>
                    <div style="font-size:11px;color:#6bc4d2;word-break:break-all;font-family:'JetBrains Mono','SF Mono',Consolas,monospace;">${resetUrl}</div>
                  </div>
                  <div style="font-size:12px;color:#5a7a9a;line-height:1.6;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                    If you didn&rsquo;t request a password reset, you can safely ignore this email. Your password will not change.
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td align="center" style="padding-top:24px;">
            <div style="font-size:11px;color:#3a5a7a;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">&copy; ${new Date().getFullYear()} IQsea &middot; Maritime intelligence, delivered.</div>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`,
    });
    if (!emailResult.success) {
      throw new Error(emailResult.error ?? "Email delivery failed");
    }
    console.log(
      "[forgot-password] Reset email sent successfully to:", email,
      "via", emailResult.provider ?? "unknown",
      emailResult.messageId ? `(id: ${emailResult.messageId})` : ""
    );
  } catch (err) {
    console.error("[forgot-password] FAILED to send reset email:", err);
    // Still return success to prevent enumeration
  }

  return successResponse;
  } catch (err) {
    console.error("[forgot-password] Unhandled error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
