/**
 * Verify M365 mailbox: check Sent Items + mailbox settings for atlas@iqsea.io.
 * Run: npx tsx scripts/verify-mailbox.ts
 *
 * This helps debug "202 Accepted but no delivery" by checking:
 *   1. Whether the sent message actually appears in Sent Items
 *   2. Mailbox settings / mailbox existence
 *   3. Whether the recipient mailbox exists and can receive
 */
import "dotenv/config";

const TENANT_ID = process.env.M365_TENANT_ID ?? "";
const CLIENT_ID = process.env.M365_CLIENT_ID ?? "";
const CLIENT_SECRET = process.env.M365_CLIENT_SECRET ?? "";
const SENDER_EMAIL = process.env.M365_SENDER_EMAIL ?? "";

async function getToken(): Promise<string> {
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
    throw new Error(`Token request failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  return data.access_token as string;
}

async function graphGet(token: string, path: string): Promise<{ status: number; body: unknown }> {
  const res = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const text = await res.text();
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: res.status, body };
}

async function main() {
  console.log("=== M365 Mailbox Verification ===\n");
  console.log("Sender:", SENDER_EMAIL);

  if (!TENANT_ID || !CLIENT_ID || !CLIENT_SECRET || !SENDER_EMAIL) {
    console.error("ERROR: Missing M365 env vars. Check .env file.");
    process.exit(1);
  }

  const token = await getToken();
  console.log("Token acquired.\n");

  // -----------------------------------------------------------------------
  // 1. Check if the sender mailbox exists and is accessible
  // -----------------------------------------------------------------------
  console.log("--- 1. Check sender mailbox existence ---");
  const userResult = await graphGet(token, `/users/${encodeURIComponent(SENDER_EMAIL)}`);
  if (userResult.status === 200) {
    const user = userResult.body as Record<string, unknown>;
    console.log("  User found:", user.displayName);
    console.log("  UPN:", user.userPrincipalName);
    console.log("  Mail:", user.mail);
    console.log("  Account enabled:", user.accountEnabled);

    // Check assigned licenses (no license = can't send mail)
    const licResult = await graphGet(
      token,
      `/users/${encodeURIComponent(SENDER_EMAIL)}/licenseDetails`
    );
    if (licResult.status === 200) {
      const lics = (licResult.body as { value: Array<Record<string, unknown>> }).value;
      if (lics.length === 0) {
        console.log("  *** WARNING: NO LICENSES ASSIGNED ***");
        console.log("  This mailbox likely cannot send email without an Exchange Online license.");
      } else {
        console.log("  Licenses:");
        for (const lic of lics) {
          const plans = (lic.servicePlans as Array<Record<string, unknown>>)
            .filter((p) => (p.provisioningStatus as string) === "Success")
            .map((p) => p.servicePlanName);
          console.log(`    - ${lic.skuPartNumber}: ${plans.join(", ")}`);
        }
        const hasExchange = lics.some((lic) =>
          (lic.servicePlans as Array<Record<string, unknown>>).some(
            (p) =>
              (p.servicePlanName as string).includes("EXCHANGE") &&
              (p.provisioningStatus as string) === "Success"
          )
        );
        if (!hasExchange) {
          console.log("  *** WARNING: No active Exchange Online plan found ***");
        } else {
          console.log("  Exchange Online plan: ACTIVE");
        }
      }
    } else {
      console.log("  Could not fetch licenses:", licResult.status);
    }
  } else if (userResult.status === 404) {
    console.error("  *** ERROR: Sender mailbox NOT FOUND ***");
    console.error("  The user", SENDER_EMAIL, "does not exist in this tenant.");
    console.error("  This explains why 202 is returned but no email is delivered.");
  } else {
    console.log("  Unexpected status:", userResult.status, userResult.body);
  }

  // -----------------------------------------------------------------------
  // 2. Check mailbox settings (to see if forwarding/rules might interfere)
  // -----------------------------------------------------------------------
  console.log("\n--- 2. Check mailbox settings ---");
  const settingsResult = await graphGet(
    token,
    `/users/${encodeURIComponent(SENDER_EMAIL)}/mailboxSettings`
  );
  if (settingsResult.status === 200) {
    const settings = settingsResult.body as Record<string, unknown>;
    console.log("  Automatic replies enabled:", (settings.automaticRepliesSetting as Record<string, unknown>)?.status);
    console.log("  Time zone:", settings.timeZone);
  } else {
    console.log("  Could not fetch mailbox settings:", settingsResult.status);
    if (settingsResult.status === 404) {
      console.log("  *** This may indicate the mailbox is not provisioned (no Exchange license) ***");
    }
  }

  // -----------------------------------------------------------------------
  // 3. List recent Sent Items
  // -----------------------------------------------------------------------
  console.log("\n--- 3. Recent messages in Sent Items ---");
  const sentResult = await graphGet(
    token,
    `/users/${encodeURIComponent(SENDER_EMAIL)}/mailFolders/SentItems/messages?$top=10&$select=subject,toRecipients,sentDateTime,isRead&$orderby=sentDateTime desc`
  );
  if (sentResult.status === 200) {
    const messages = (sentResult.body as { value: Array<Record<string, unknown>> }).value;
    if (messages.length === 0) {
      console.log("  *** NO MESSAGES in Sent Items ***");
      console.log("  If you sent test emails and nothing is here, the mailbox may not be processing them.");
    } else {
      for (const msg of messages) {
        const recipients = (msg.toRecipients as Array<{ emailAddress: { address: string } }>)
          .map((r) => r.emailAddress.address)
          .join(", ");
        console.log(`  [${msg.sentDateTime}] "${msg.subject}" → ${recipients}`);
      }
    }
  } else {
    console.log("  Could not read Sent Items:", sentResult.status);
    if (sentResult.status === 404) {
      console.log("  *** Mailbox does not exist or is not licensed ***");
    }
  }

  // -----------------------------------------------------------------------
  // 4. Check recipient mailbox (admin@iqsea.io)
  // -----------------------------------------------------------------------
  console.log("\n--- 4. Check recipient mailbox (admin@iqsea.io) ---");
  const recipResult = await graphGet(token, `/users/${encodeURIComponent("admin@iqsea.io")}`);
  if (recipResult.status === 200) {
    const user = recipResult.body as Record<string, unknown>;
    console.log("  Recipient found:", user.displayName);
    console.log("  Account enabled:", user.accountEnabled);
  } else if (recipResult.status === 404) {
    console.log("  *** WARNING: admin@iqsea.io NOT FOUND as a user ***");
    console.log("  It may be a shared mailbox, distribution list, or external — check Exchange Admin Center.");
  } else {
    console.log("  Status:", recipResult.status);
  }

  // -----------------------------------------------------------------------
  // 5. Check inbox of recipient for recent debug emails
  // -----------------------------------------------------------------------
  console.log("\n--- 5. Check admin@iqsea.io Inbox + Junk for debug emails ---");
  for (const folder of ["Inbox", "JunkEmail"]) {
    const inboxResult = await graphGet(
      token,
      `/users/${encodeURIComponent("admin@iqsea.io")}/mailFolders/${folder}/messages?$top=10&$filter=contains(subject,'DEBUG') or contains(subject,'Intel Brief') or contains(subject,'Password')&$select=subject,from,receivedDateTime&$orderby=receivedDateTime desc`
    );
    if (inboxResult.status === 200) {
      const messages = (inboxResult.body as { value: Array<Record<string, unknown>> }).value;
      console.log(`  ${folder}: ${messages.length} matching messages`);
      for (const msg of messages) {
        const from = (msg.from as { emailAddress: { address: string } })?.emailAddress?.address;
        console.log(`    [${msg.receivedDateTime}] "${msg.subject}" from ${from}`);
      }
    } else {
      console.log(`  Could not read ${folder}:`, inboxResult.status);
    }
  }

  console.log("\n=== Verification complete ===");
}

main().catch((e) => console.error("Unhandled error:", e));
