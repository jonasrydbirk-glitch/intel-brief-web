import { NextResponse } from "next/server";
import { findUserByEmail, verifyPassword } from "@/app/lib/auth";
import { createSession } from "@/app/lib/session";

/** Always return application/json — never let an uncaught throw produce a
 *  raw 500 HTML page that the browser's `res.json()` can't parse. */
function jsonError(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  try {
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return jsonError("Invalid request body", 400);
    }

    const email = (typeof body.email === "string" ? body.email : "").trim();
    const password = (typeof body.password === "string" ? body.password : "").trim();

    if (!email || !password) {
      return jsonError("Email and password are required", 400);
    }

    const user = await findUserByEmail(email);
    if (!user || !user.data.password_hash) {
      return jsonError("Invalid email or password", 401);
    }

    const valid = await verifyPassword(password, user.data.password_hash as string);
    if (!valid) {
      return jsonError("Invalid email or password", 401);
    }

    await createSession(user.data.id as string, email);

    return NextResponse.json({
      success: true,
      id: user.data.id,
    });
  } catch (err) {
    console.error("[login] Unhandled error:", err);
    return jsonError("Internal server error — please try again");
  }
}
