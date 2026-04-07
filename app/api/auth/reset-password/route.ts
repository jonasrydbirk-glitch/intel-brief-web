import { NextResponse } from "next/server";
import { hashPassword } from "@/app/lib/auth";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  const body = await request.json();
  const token = (body.token || "").trim();
  const password = (body.password || "").trim();

  if (!token || !password) {
    return NextResponse.json(
      { error: "Token and password are required" },
      { status: 400 }
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 }
    );
  }

  // Look up the token
  const { data: resetRecord, error: lookupError } = await supabase
    .from("password_reset_tokens")
    .select("*")
    .eq("token", token)
    .single();

  if (lookupError || !resetRecord) {
    return NextResponse.json(
      { error: "Invalid or expired reset link" },
      { status: 400 }
    );
  }

  // Check expiration
  if (new Date(resetRecord.expires_at) < new Date()) {
    // Clean up expired token
    await supabase
      .from("password_reset_tokens")
      .delete()
      .eq("id", resetRecord.id);

    return NextResponse.json(
      { error: "This reset link has expired. Please request a new one." },
      { status: 400 }
    );
  }

  // Hash the new password and update the user
  const newHash = await hashPassword(password);
  const { error: updateError } = await supabase
    .from("subscribers")
    .update({ password_hash: newHash })
    .eq("id", resetRecord.user_id);

  if (updateError) {
    console.error("Failed to update password:", updateError);
    return NextResponse.json(
      { error: "Failed to update password" },
      { status: 500 }
    );
  }

  // Delete the used token
  await supabase
    .from("password_reset_tokens")
    .delete()
    .eq("id", resetRecord.id);

  return NextResponse.json({ success: true });
}
