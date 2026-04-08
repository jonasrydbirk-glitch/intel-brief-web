import { NextResponse } from "next/server";
import { verifySession } from "@/app/lib/session";
import { getUserById, hashPassword, verifyPassword } from "@/app/lib/auth";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const currentPassword = (body.currentPassword || "").trim();
  const newPassword = (body.newPassword || "").trim();

  if (!currentPassword || !newPassword) {
    return NextResponse.json(
      { error: "Current password and new password are required" },
      { status: 400 }
    );
  }

  if (newPassword.length < 8) {
    return NextResponse.json(
      { error: "New password must be at least 8 characters" },
      { status: 400 }
    );
  }

  const user = await getUserById(session.userId);
  if (!user || !user.data.password_hash) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const valid = await verifyPassword(
    currentPassword,
    user.data.password_hash as string
  );
  if (!valid) {
    return NextResponse.json(
      { error: "Current password is incorrect" },
      { status: 401 }
    );
  }

  const newHash = await hashPassword(newPassword);
  const { error } = await supabase
    .from("subscribers")
    .update({ password_hash: newHash })
    .eq("id", session.userId);

  if (error) {
    return NextResponse.json({ error: "Failed to update password" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[change-password] Unhandled error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
