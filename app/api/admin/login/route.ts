import { NextResponse } from "next/server";

/** Strip whitespace AND invisible Unicode (BOM, zero-width chars, control chars) */
function sanitize(s: string): string {
  // Remove BOM, zero-width spaces, control chars, then trim
  return s.replace(/[\u200B-\u200D\uFEFF\u00A0\u0000-\u001F\u007F]/g, "").trim();
}

export async function POST(request: Request) {
  const body = await request.json();
  const { password } = body;

  const rawEnv = process.env.ADMIN_PASSWORD ?? "";
  const adminPassword = sanitize(rawEnv);

  if (!adminPassword) {
    console.error("[CRITICAL] ADMIN_PASSWORD environment variable is missing or empty after sanitization");
    return NextResponse.json(
      { error: "ADMIN_PASSWORD environment variable is not set" },
      { status: 500 }
    );
  }

  const inputSanitized = typeof password === "string" ? sanitize(password) : "";
  const match = inputSanitized === adminPassword;

  if (!match) {
    console.error(
      `[admin/login] password mismatch — input length=${inputSanitized.length}, expected length=${adminPassword.length}, raw env length=${rawEnv.length}`
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
