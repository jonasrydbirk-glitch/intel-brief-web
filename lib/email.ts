/**
 * IQsea Unified Email Utility
 *
 * Single call site for all outbound email.  Transport selection:
 *
 *   1. Resend     — if RESEND_API_KEY is set (preferred; iqsea.io domain verified)
 *   2. Graph API  — fallback if GRAPH_CLIENT_ID / TENANT_ID / CLIENT_SECRET are set
 *
 * Usage:
 *   import { sendEmail } from '@/lib/email';
 *
 *   const result = await sendEmail({ to, subject, html, attachments });
 *   if (!result.success) throw new Error(result.error);
 *
 * The function never throws — it always returns a result object so the
 * caller can decide whether to re-throw or log-and-continue.
 *
 * From addresses:
 *   Default brief:         IQsea Intel Brief <brief@iqsea.io>
 *   Password reset / auth: IQsea <noreply@iqsea.io>
 *   Custom:                pass opts.from — any @iqsea.io address works
 *                          (domain is verified in Resend via Cloudflare)
 */

import { Resend } from "resend";
import { sendViaGraph } from "./postman";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EmailAttachment {
  filename: string;
  /**
   * Attachment data as a Buffer or a base64-encoded string.
   * Both Resend and the Graph API fallback accept either form.
   */
  content: Buffer | string;
  contentType?: string;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  /** HTML email body. */
  html: string;
  /** Sender address.  Defaults to "IQsea Intel Brief <brief@iqsea.io>".
   *  Can be a bare address ("noreply@iqsea.io") — display name is added automatically. */
  from?: string;
  attachments?: EmailAttachment[];
}

export interface SendEmailResult {
  success: boolean;
  error?: string;
  /** Provider-assigned message ID — present on Resend success, absent on Graph. */
  messageId?: string;
  /** Which transport was used for this send. */
  provider?: "resend" | "graph";
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? "";

/** Coerce a bare "email@domain.com" address into "IQsea <email@domain.com>" format.
 *  If the address already contains "<", it is returned as-is. */
function formatFrom(raw: string): string {
  if (raw.includes("<")) return raw;
  // Map known addresses to friendly display names
  if (raw.startsWith("brief@") || raw.startsWith("intel@")) {
    return `IQsea Intel Brief <${raw}>`;
  }
  return `IQsea <${raw}>`;
}

const DEFAULT_FROM = formatFrom("brief@iqsea.io");

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Send an email via Resend (preferred) or Graph API (fallback).
 * Never throws — returns { success: false, error } on failure.
 */
export async function sendEmail(
  opts: SendEmailOptions
): Promise<SendEmailResult> {
  if (RESEND_API_KEY) {
    return sendViaResend(opts);
  }

  // Check Graph credentials before attempting the fallback
  const hasGraph =
    process.env.GRAPH_CLIENT_ID &&
    process.env.GRAPH_TENANT_ID &&
    process.env.GRAPH_CLIENT_SECRET;

  if (hasGraph) {
    return sendViaGraphFallback(opts);
  }

  return {
    success: false,
    error:
      "No email transport configured — set RESEND_API_KEY (preferred) or " +
      "GRAPH_CLIENT_ID / GRAPH_TENANT_ID / GRAPH_CLIENT_SECRET.",
  };
}

// ---------------------------------------------------------------------------
// Resend transport
// ---------------------------------------------------------------------------

async function sendViaResend(opts: SendEmailOptions): Promise<SendEmailResult> {
  const resend = new Resend(RESEND_API_KEY);
  const from = formatFrom(opts.from ?? DEFAULT_FROM);

  try {
    const { data, error } = await resend.emails.send({
      from,
      to:      opts.to,
      subject: opts.subject,
      html:    opts.html,
      attachments: opts.attachments?.map((a) => ({
        filename: a.filename,
        // Resend expects a Buffer; convert base64 strings at the boundary
        content:
          typeof a.content === "string"
            ? Buffer.from(a.content, "base64")
            : a.content,
      })),
    });

    if (error) {
      return { success: false, error: error.message, provider: "resend" };
    }
    return { success: true, messageId: data?.id, provider: "resend" };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Unknown Resend error";
    return { success: false, error: message, provider: "resend" };
  }
}

// ---------------------------------------------------------------------------
// Microsoft Graph API fallback
// ---------------------------------------------------------------------------

/**
 * Wraps sendViaGraph() from lib/postman.ts in the unified result shape.
 * Graph API doesn't return a message ID; messageId will be undefined.
 */
async function sendViaGraphFallback(
  opts: SendEmailOptions
): Promise<SendEmailResult> {
  try {
    await sendViaGraph({
      to:       opts.to,
      subject:  opts.subject,
      htmlBody: opts.html,
      from:     opts.from,
      attachments: opts.attachments?.map((a) => ({
        filename:     a.filename,
        contentBytes:
          typeof a.content === "string"
            ? a.content
            : a.content.toString("base64"),
        contentType: a.contentType ?? "application/octet-stream",
      })),
    });
    return { success: true, provider: "graph" };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Unknown Graph API error";
    return { success: false, error: message, provider: "graph" };
  }
}
