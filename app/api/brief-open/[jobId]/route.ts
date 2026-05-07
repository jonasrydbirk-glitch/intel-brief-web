import { createClient } from "@supabase/supabase-js";
import { verifyBriefLinkToken } from "@/lib/brief-link";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_KEY ?? "placeholder",
  { auth: { persistSession: false } }
);

// 1×1 transparent GIF — 43 bytes, the smallest legal GIF.
const TRANSPARENT_GIF = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

const PIXEL_HEADERS = {
  "Content-Type":  "image/gif",
  "Content-Length": String(TRANSPARENT_GIF.length),
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  "Pragma":        "no-cache",
  "Expires":       "0",
} as const;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const url = new URL(request.url);
  const token = url.searchParams.get("t");

  // Always serve the pixel — even on bad token, returning an error would
  // surface as a broken image in the recipient's mail client.  Just don't
  // log opens we can't authenticate.
  if (verifyBriefLinkToken(jobId, token)) {
    supabaseAdmin
      .rpc("increment_email_open", { p_job_id: jobId })
      .then(({ error: rpcErr }) => {
        if (rpcErr) console.error(`[brief-open] tracking failed for ${jobId}: ${rpcErr.message}`);
      });
  }

  return new Response(TRANSPARENT_GIF, { status: 200, headers: PIXEL_HEADERS });
}
