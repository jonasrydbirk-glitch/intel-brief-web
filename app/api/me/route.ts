import { NextResponse } from "next/server";
import { verifySession } from "@/app/lib/session";
import { getUserById } from "@/app/lib/auth";

export async function GET() {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await getUserById(session.userId);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Don't expose password_hash to the client
  const { password_hash: _, ...safeData } = user.data as Record<string, unknown>;
  return NextResponse.json(safeData);
}
