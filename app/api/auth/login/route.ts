import { NextResponse } from "next/server";
import { findUserByEmail, verifyPassword } from "@/app/lib/auth";
import { createSession } from "@/app/lib/session";

export async function POST(request: Request) {
  const body = await request.json();
  const email = (body.email || "").trim();
  const password = (body.password || "").trim();

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 }
    );
  }

  const user = await findUserByEmail(email);
  if (!user || !user.data.password_hash) {
    return NextResponse.json(
      { error: "Invalid email or password" },
      { status: 401 }
    );
  }

  const valid = await verifyPassword(password, user.data.password_hash as string);
  if (!valid) {
    return NextResponse.json(
      { error: "Invalid email or password" },
      { status: 401 }
    );
  }

  await createSession(user.data.id as string, email);

  return NextResponse.json({
    success: true,
    id: user.data.id,
  });
}
