import "dotenv/config";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL + "/rest/v1/password_reset_tokens?select=id,user_id,expires_at,created_at&order=created_at.desc&limit=5";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const res = await fetch(url, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  console.log("Status:", res.status);
  const rows = await res.json();
  console.log("Tokens:", JSON.stringify(rows, null, 2));
}
main().catch(e => console.error(e));
