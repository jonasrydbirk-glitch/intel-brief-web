import "dotenv/config";

async function main() {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;

  // Check for atlas@iqsea.io (exact match)
  const emails = ["atlas@iqsea.io", "atlas@IQsea.io"];
  for (const email of emails) {
    const url = `${base}/rest/v1/subscribers?select=id,email&email=eq.${encodeURIComponent(email)}`;
    const res = await fetch(url, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
    const rows = await res.json();
    console.log(`Query email="${email}":`, JSON.stringify(rows));
  }

  // List all subscribers (first 10)
  const allUrl = `${base}/rest/v1/subscribers?select=id,email&limit=10`;
  const allRes = await fetch(allUrl, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  const all = await allRes.json();
  console.log("\nAll subscribers (first 10):");
  for (const s of all) {
    console.log(`  id=${s.id} email=${s.email}`);
  }
}
main().catch(e => console.error(e));
