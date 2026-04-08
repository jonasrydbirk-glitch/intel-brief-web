/**
 * IQsea Postman — Microsoft Graph API Email Delivery
 *
 * Sends emails via Microsoft 365 Graph API using the client-credentials
 * OAuth2 flow. Runs locally on the Beelink — no remote web API needed.
 *
 * Required env vars:
 *   GRAPH_CLIENT_ID     — Azure AD App Registration client ID
 *   GRAPH_TENANT_ID     — Azure AD tenant ID
 *   GRAPH_CLIENT_SECRET — Azure AD client secret
 *   GRAPH_SENDER_EMAIL  — (optional) Mailbox to send from; defaults to admin@iqsea.io
 */

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const TENANT_ID = process.env.GRAPH_TENANT_ID ?? "";
const CLIENT_ID = process.env.GRAPH_CLIENT_ID ?? "";
const CLIENT_SECRET = process.env.GRAPH_CLIENT_SECRET ?? "";
const SENDER_EMAIL = process.env.GRAPH_SENDER_EMAIL ?? "admin@iqsea.io";

// ---------------------------------------------------------------------------
// Token cache (simple in-memory, re-fetches when expired)
// ---------------------------------------------------------------------------

let cachedToken: string | null = null;
let tokenExpiry = 0;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;

  if (!TENANT_ID || !CLIENT_ID || !CLIENT_SECRET) {
    throw new Error(
      "Graph API credentials missing — set GRAPH_TENANT_ID, GRAPH_CLIENT_ID, and GRAPH_CLIENT_SECRET"
    );
  }

  const tokenUrl = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`;

  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  });

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Graph token request failed (${res.status}): ${text}`);
  }

  const json = await res.json();
  cachedToken = json.access_token;
  // Expire 5 minutes early to avoid edge-case failures
  tokenExpiry = Date.now() + (json.expires_in - 300) * 1000;
  return cachedToken!;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface PostmanAttachment {
  filename: string;
  contentBytes: string; // base64-encoded
  contentType: string;
}

export interface PostmanOptions {
  to: string;
  subject: string;
  htmlBody: string;
  attachments?: PostmanAttachment[];
  /** Override sender mailbox (must have SendAs permission in Azure AD). */
  from?: string;
}

/**
 * Send an email via Microsoft Graph API (client-credentials flow).
 * The PDF buffer should be passed as a base64 string in attachments.
 */
export async function sendViaGraph(opts: PostmanOptions): Promise<void> {
  const token = await getAccessToken();
  const sender = opts.from ?? SENDER_EMAIL;

  const message: Record<string, unknown> = {
    subject: opts.subject,
    body: {
      contentType: "HTML",
      content: opts.htmlBody,
    },
    toRecipients: [
      {
        emailAddress: { address: opts.to },
      },
    ],
  };

  if (opts.attachments && opts.attachments.length > 0) {
    message.attachments = opts.attachments.map((a) => ({
      "@odata.type": "#microsoft.graph.fileAttachment",
      name: a.filename,
      contentBytes: a.contentBytes,
      contentType: a.contentType,
    }));
  }

  const graphUrl = `https://graph.microsoft.com/v1.0/users/${sender}/sendMail`;

  const res = await fetch(graphUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message, saveToSentItems: true }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Graph sendMail failed (${res.status}): ${text}`);
  }
}
