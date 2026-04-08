import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();
  const { password } = body;

  const adminPassword = process.env.ADMIN_PASSWORD?.trim();

  if (!adminPassword) {
    return NextResponse.json(
      { error: "ADMIN_PASSWORD environment variable is not set" },
      { status: 500 }
    );
  }

  const inputTrimmed = typeof password === "string" ? password.trim() : "";
  const match = inputTrimmed === adminPassword;

  if (!match) {
    console.error(
      `[admin/login] password mismatch — input length=${inputTrimmed.length}, expected length=${adminPassword.length}`
    );
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  // Set cookie directly on the response object so the Set-Cookie header
  // is guaranteed to be included (cookies() from next/headers can silently
  // drop the header when a new NextResponse is returned).
  const response = NextResponse.json({ success: true });
  response.cookies.set("admin_session", "authenticated", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8, // 8 hours
  });

  return response;
}
