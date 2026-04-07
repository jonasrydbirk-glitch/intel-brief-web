import "dotenv/config";
import { randomBytes } from "crypto";

async function main() {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;

  // First, get the user
  const userUrl = `${base}/rest/v1/subscribers?select=id,email&email=eq.admin@iqsea.io`;
  const userRes = await fetch(userUrl, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  const users = await userRes.json();
  console.log("User found:", JSON.stringify(users));

  if (users.length === 0) {
    console.log("No user found");
    return;
  }

  const userId = users[0].id;
  console.log("User ID:", userId, "Type:", typeof userId);

  // Try to insert a token
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  console.log("\nAttempting insert with user_id:", userId);
  const insertUrl = `${base}/rest/v1/password_reset_tokens`;
  const insertRes = await fetch(insertUrl, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({ user_id: userId, token, expires_at: expiresAt }),
  });

  console.log("Insert status:", insertRes.status);
  const insertBody = await insertRes.text();
  console.log("Insert response:", insertBody);
}
main().catch(e => console.error(e));
