import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";

/** Strip whitespace AND invisible Unicode (BOM, zero-width chars, control chars) */
function sanitize(s: string): string {
  return s.replace(/[\u200B-\u200D\uFEFF\u00A0\u0000-\u001F\u007F]/g, "").trim();
}

function safeCompare(a: string, b: string): boolean {
  if (!a || !b) return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
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

  if (!adminPassword && !overridePassword) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 500 });
  }

  const primaryMatch = safeCompare(inputSanitized, adminPassword);
  const overrideMatch = safeCompare(inputSanitized, overridePassword);

  if (!primaryMatch && !overrideMatch) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  // Session token: use ADMIN_SESSION_SECRET (a stable env-var UUID Jonas sets once).
  // Verified in proxy.ts with timingSafeEqual — not a plain string comparison.
  const sessionSecret = process.env.ADMIN_SESSION_SECRET ?? "";
  if (!sessionSecret) {
    console.error("[admin/login] ADMIN_SESSION_SECRET is not configured");
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set("admin_session", sessionSecret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8, // 8 hours
  });

  return response;
}
