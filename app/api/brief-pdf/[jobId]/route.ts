import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyBriefLinkToken } from "@/lib/brief-link";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_KEY ?? "placeholder",
  { auth: { persistSession: false } }
);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const url = new URL(request.url);
  const token = url.searchParams.get("t");

  if (!verifyBriefLinkToken(jobId, token)) {
    return NextResponse.json({ error: "Invalid or expired link" }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from("brief_jobs")
    .select("pdf_base64, pdf_filename")
    .eq("id", jobId)
    .single();

  if (error || !data?.pdf_base64) {
    return NextResponse.json({ error: "Brief not found" }, { status: 404 });
  }

  // Best-effort tracking — never block the download
  supabaseAdmin
    .rpc("increment_pdf_download", { p_job_id: jobId })
    .then(({ error: rpcErr }) => {
      if (rpcErr) console.error(`[brief-pdf] tracking failed for ${jobId}: ${rpcErr.message}`);
    });

  const pdfBuffer = Buffer.from(data.pdf_base64, "base64");
  const filename = data.pdf_filename || `IQsea-Intel-Brief-${jobId}.pdf`;

  return new Response(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type":        "application/pdf",
      "Content-Length":      String(pdfBuffer.length),
      "Content-Disposition": `inline; filename="${filename.replace(/"/g, "")}"`,
      "Cache-Control":       "private, no-store",
    },
  });
}
