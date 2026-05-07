/**
 * Signed-link helpers for tracked brief delivery.
 *
 * Email recipients receive a "View Your Intelligence Brief" button and a
 * 1×1 tracking pixel; both URLs carry a job ID + HMAC-SHA256 signature so
 * the API routes can authenticate the recipient without a session.
 *
 * Secret resolution:
 *   1. BRIEF_LINK_SECRET    — preferred, dedicated to brief links
 *   2. SESSION_SECRET       — fallback so existing deployments don't 500
 *                             before the new env var is provisioned
 */

import { createHmac, timingSafeEqual } from "node:crypto";

function getSecret(): string {
  const secret = process.env.BRIEF_LINK_SECRET ?? process.env.SESSION_SECRET ?? "";
  if (!secret) {
    throw new Error(
      "BRIEF_LINK_SECRET (or SESSION_SECRET) must be set to sign brief delivery links."
    );
  }
  return secret;
}

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL ?? "https://iqsea.io";
}

export function signBriefLinkToken(jobId: string): string {
  return createHmac("sha256", getSecret()).update(jobId).digest("hex");
}

/** Constant-time compare; returns false on any length mismatch or bad input. */
export function verifyBriefLinkToken(jobId: string, token: string | null | undefined): boolean {
  if (!token) return false;
  const expected = signBriefLinkToken(jobId);
  if (token.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(token, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}

/** Public URL the recipient clicks to view the brief PDF. */
export function buildBriefViewUrl(jobId: string): string {
  const token = signBriefLinkToken(jobId);
  return `${getBaseUrl()}/api/brief-pdf/${encodeURIComponent(jobId)}?t=${token}`;
}

/** 1×1 transparent GIF URL for email-open tracking. */
export function buildBriefOpenPixelUrl(jobId: string): string {
  const token = signBriefLinkToken(jobId);
  return `${getBaseUrl()}/api/brief-open/${encodeURIComponent(jobId)}?t=${token}`;
}
