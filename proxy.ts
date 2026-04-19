import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const encodedKey = new TextEncoder().encode(process.env.SESSION_SECRET!);

async function verifySessionCookie(
  request: NextRequest
): Promise<{ userId: string; email: string } | null> {
  const token = request.cookies.get("iqsea_session")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, encodedKey, {
      algorithms: ["HS256"],
    });
    return payload as unknown as { userId: string; email: string };
  } catch {
    return null;
  }
}

function verifyAdminCookie(request: NextRequest): boolean {
  const token = request.cookies.get("admin_session")?.value;
  const secret = process.env.ADMIN_SESSION_SECRET ?? "";
  if (!token || !secret) return false;
  // Use length-constant comparison to prevent timing attacks
  const bufToken  = Buffer.from(token);
  const bufSecret = Buffer.from(secret);
  if (bufToken.length !== bufSecret.length) return false;
  // timingSafeEqual is available in Node.js but not in the Edge runtime.
  // We use a manual XOR instead so this works in both runtimes.
  let diff = 0;
  for (let i = 0; i < bufToken.length; i++) {
    diff |= bufToken[i] ^ bufSecret[i];
  }
  return diff === 0;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const clean = pathname.replace(/\/+$/, "");
  if (
    clean === "/admin/login" ||
    clean === "/api/admin/login"
  ) {
    return NextResponse.next();
  }

  // Protect /admin and /api/admin routes with admin_session cookie
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    if (!verifyAdminCookie(request)) {
      if (pathname.startsWith("/api/admin")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  // Protect /profile and /settings routes with user session cookie
  if (pathname.startsWith("/profile") || pathname.startsWith("/settings")) {
    const session = await verifySessionCookie(request);
    if (!session) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
    "/profile/:path*",
    "/settings/:path*",
  ],
};
