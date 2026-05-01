import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

const secret = process.env.SESSION_SECRET ?? "";

export type EmailTokenPurpose = "unsub" | "feedback";

export function signEmailToken(purpose: EmailTokenPurpose, subscriberId: string): string {
  if (!secret) {
    throw new Error("Cannot sign email token: SESSION_SECRET is not configured");
  }
  return createHmac("sha256", secret)
    .update(`${purpose}:${subscriberId}`)
    .digest("base64url");
}

export function verifyEmailToken(
  purpose: EmailTokenPurpose,
  subscriberId: string,
  token: string | null | undefined,
): boolean {
  if (!secret || !token || !subscriberId) return false;

  let expected: Buffer;
  let received: Buffer;
  try {
    expected = Buffer.from(signEmailToken(purpose, subscriberId), "base64url");
    received = Buffer.from(token, "base64url");
  } catch {
    return false;
  }
  if (expected.length !== received.length) return false;
  return timingSafeEqual(expected, received);
}
