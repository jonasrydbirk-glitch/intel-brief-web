import { NextResponse } from "next/server";

/** Strip whitespace AND invisible Unicode (BOM, zero-width chars, control chars) */
function sanitize(s: string): string {
  return s.replace(/[\u200B-\u200D\uFEFF\u00A0\u0000-\u001F\u007F]/g, "").trim();
}

export async function POST(request: Request) {
  const body = await request.json();
  const { password } = body;

  const inputSanitized = typeof password === "string" ? sanitize(password) : "";

  // Primary: check ADMIN_PASSWORD
  const rawEnv = process.env.ADMIN_PASSWORD ?? "";
  const adminPassword = sanitize(rawEnv);

  // Fallback: ADMIN_OVERRIDE — a second env var Jonas can set to a known-clean
  // value if ADMIN_PASSWORD is corrupted by invisible chars or encoding issues.
  const rawOverride = process.env.ADMIN_OVERRIDE ?? "";
  const overridePassword = sanitize(rawOverride);

  const primaryMatch = adminPassword && inputSanitized === adminPassword;
  const overrideMatch = overridePassword && inputSanitized === overridePassword;

  if (!adminPassword && !overridePassword) {
    console.error("[CRITICAL] Neither ADMIN_PASSWORD nor ADMIN_OVERRIDE is set");
    return NextResponse.json(
      { error: "Admin credentials are not configured" },
      { status: 500 }
    );
  }

  if (!primaryMatch && !overrideMatch) {
    console.error(
      `[admin/login] password mismatch — input length=${inputSanitized.length}, ` +
      `primary env length=${adminPassword.length} (raw ${rawEnv.length}), ` +
      `override set=${!!overridePassword}`
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
