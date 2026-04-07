/**
 * IQsea Email Delivery Engine
 *
 * Sends emails via Microsoft 365 SMTP AUTH (STARTTLS on port 587).
 *
 * Required env vars:
 *   M365_PASSWORD     — App password (or user password) for admin@iqsea.io
 *   M365_SENDER_EMAIL — (optional) Override the "from" address; defaults to admin@iqsea.io
 */

import * as nodemailer from "nodemailer";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const SMTP_USER = "admin@iqsea.io";
const SMTP_PASS = process.env.M365_PASSWORD ?? "";

/** Default sender — can be overridden per-email via `from` option. */
const DEFAULT_FROM =
  process.env.M365_SENDER_EMAIL || "brief@iqsea.io";

// Known aliases that may be used as the "from" address (stored lower-cased).
const ALLOWED_FROM = new Set([
  "brief@iqsea.io",
  "noreply@iqsea.io",
  "admin@iqsea.io",
  "atlas@iqsea.io",
]);

// ---------------------------------------------------------------------------
// Transporter (reused across calls)
// ---------------------------------------------------------------------------

const transporter = nodemailer.createTransport({
  host: "smtp.office365.com",
  port: 587,
  secure: false, // STARTTLS
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
  tls: {
    ciphers: "SSLv3",
    rejectUnauthorized: true,
  },
});

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface EmailAttachment {
  filename: string;
  contentBytes: string; // base64-encoded
  contentType: string;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  htmlBody: string;
  attachments?: EmailAttachment[];
  /** Optional "from" address — must be an allowed alias. Defaults to brief@iqsea.io. */
  from?: string;
}

/**
 * Send an email via Office 365 SMTP AUTH.
 */
export async function sendEmail(opts: SendEmailOptions): Promise<void> {
  if (!SMTP_PASS) {
    throw new Error("M365_PASSWORD not configured in .env");
  }

  const from = opts.from ?? DEFAULT_FROM;
  if (!ALLOWED_FROM.has(from.toLowerCase())) {
    throw new Error(
      `Sender "${from}" is not in the allowed alias list. ` +
      `Allowed: ${Array.from(ALLOWED_FROM).join(", ")}`
    );
  }

  const mailOptions: nodemailer.SendMailOptions = {
    from: `IQsea <${from}>`,
    to: opts.to,
    subject: opts.subject,
    html: opts.htmlBody,
  };

  if (opts.attachments && opts.attachments.length > 0) {
    mailOptions.attachments = opts.attachments.map((a) => ({
      filename: a.filename,
      content: Buffer.from(a.contentBytes, "base64"),
      contentType: a.contentType,
    }));
  }

  await transporter.sendMail(mailOptions);
}

/**
 * Verify that SMTP credentials are configured and the server is reachable.
 */
export async function verifySmtpConnection(): Promise<{
  ok: boolean;
  error?: string;
}> {
  try {
    if (!SMTP_PASS) {
      throw new Error("M365_PASSWORD not configured in .env");
    }
    await transporter.verify();
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
