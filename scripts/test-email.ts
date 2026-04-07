/**
 * Debug script: test M365 email delivery end-to-end.
 * Run: npx tsx scripts/test-email.ts
 */
import "dotenv/config";

const TENANT_ID = process.env.M365_TENANT_ID ?? "";
const CLIENT_ID = process.env.M365_CLIENT_ID ?? "";
const CLIENT_SECRET = process.env.M365_CLIENT_SECRET ?? "";
const SENDER_EMAIL = process.env.M365_SENDER_EMAIL ?? "";
const TEST_RECIPIENT = process.argv[2] || "admin@iqsea.io";

async function main() {
  console.log("=== M365 Email Debug ===");
  console.log("TENANT_ID set:", !!TENANT_ID);
  console.log("CLIENT_ID set:", !!CLIENT_ID);
  console.log("CLIENT_SECRET set:", !!CLIENT_SECRET);
  console.log("SENDER_EMAIL:", SENDER_EMAIL);

  // Step 1: Get token
  console.log("\n--- Step 1: Acquire access token ---");
  const tokenUrl = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  });

  const tokenRes = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  console.log("Token response status:", tokenRes.status);
  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    console.error("TOKEN FAILED:", text);
    return;
  }

  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token as string;
  console.log("Token acquired, length:", accessToken.length);
  console.log("Expires in:", tokenData.expires_in, "seconds");

  // Step 2: Send test email
  console.log("\n--- Step 2: Send test email via Graph API ---");
  const graphUrl = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(SENDER_EMAIL)}/sendMail`;
  console.log("Graph URL:", graphUrl);

  const mailPayload = {
    message: {
      subject: "[DEBUG] Password Reset Delivery Test",
      body: {
        contentType: "HTML",
        content: "<p>This is a debug test from the password reset flow. If you received this, email delivery is working.</p>",
      },
      toRecipients: [{ emailAddress: { address: TEST_RECIPIENT } }],
    },
    saveToSentItems: true,
  };

  const mailRes = await fetch(graphUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(mailPayload),
  });

  console.log("sendMail response status:", mailRes.status);
  if (!mailRes.ok) {
    const text = await mailRes.text();
    console.error("SEND FAILED:", text);

    if (mailRes.status === 403) {
      console.error("\n>>> ACTION REQUIRED: Mail.Send permission not granted.");
      console.error(">>> Go to Azure Portal > App registrations > API permissions");
      console.error(">>> Add: Microsoft Graph > Application > Mail.Send");
      console.error(">>> Then click 'Grant admin consent'");
    }
    if (mailRes.status === 401) {
      console.error("\n>>> ACTION REQUIRED: Authentication failed. Check CLIENT_SECRET.");
    }
  } else {
    console.log("SUCCESS: Email sent to", TEST_RECIPIENT);
  }

  // Step 3: Check Supabase token table
  console.log("\n--- Step 3: Check password_reset_tokens table ---");
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn("Supabase not configured, skipping DB check.");
    return;
  }

  const dbRes = await fetch(
    `${SUPABASE_URL}/rest/v1/password_reset_tokens?select=id,user_id,expires_at,created_at&order=created_at.desc&limit=5`,
    {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
    }
  );

  console.log("Supabase response status:", dbRes.status);
  if (dbRes.ok) {
    const rows = await dbRes.json();
    if (rows.length === 0) {
      console.log("No tokens found in password_reset_tokens table.");
    } else {
      console.log("Recent tokens:");
      for (const r of rows) {
        const expired = new Date(r.expires_at) < new Date();
        console.log(`  id=${r.id} user=${r.user_id} expires=${r.expires_at} ${expired ? "(EXPIRED)" : "(valid)"}`);
      }
    }
  } else {
    const text = await dbRes.text();
    console.error("DB query failed:", text);
  }
}

main().catch((e) => console.error("Unhandled error:", e));
