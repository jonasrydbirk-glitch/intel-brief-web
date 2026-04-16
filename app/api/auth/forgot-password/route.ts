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
      subject: "Reset your IQsea Password",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 40px 20px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="color: #e8eef4; font-size: 24px; margin: 0;">Reset Your Password</h1>
          </div>
          <div style="background: #0f1b30; border: 1px solid #1a3358; border-radius: 12px; padding: 32px;">
            <p style="color: #b0c4d8; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
              We received a request to reset the password for your IQsea account. Click the button below to set a new password.
            </p>
            <div style="text-align: center; margin: 28px 0;">
              <a href="${resetUrl}" style="display: inline-block; background: #53b1c1; color: #0b1424; font-weight: 600; font-size: 15px; text-decoration: none; padding: 14px 32px; border-radius: 8px;">
                Reset Password
              </a>
            </div>
            <p style="color: #8fa8c4; font-size: 13px; line-height: 1.5; margin: 24px 0 0;">
              This link will expire in 1 hour. If you didn&rsquo;t request a password reset, you can safely ignore this email.
            </p>
          </div>
          <p style="color: #8fa8c4; font-size: 12px; text-align: center; margin-top: 32px;">
            &copy; ${new Date().getFullYear()} IQsea. Maritime intelligence, delivered.
          </p>
        </div>
      `,
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
