import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { checkPreviewRateLimit } from "@/app/lib/rate-limit";
import { headers } from "next/headers";

// ---------------------------------------------------------------------------
// POST /api/preview-story — enqueue a preview job, return jobId
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const subject = (body.subject ?? "").trim();

    if (!subject) {
      return NextResponse.json(
        { error: "Subject is required" },
        { status: 400 }
      );
    }

    if (subject.length > 200) {
      return NextResponse.json(
        { error: "Subject must be 200 characters or fewer" },
        { status: 400 }
      );
    }

    // Determine client IP for rate limiting
    const headersList = await headers();
    const ip =
      headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      headersList.get("x-real-ip") ??
      "unknown";

    const { allowed, resetAt } = await checkPreviewRateLimit(ip);

    if (!allowed) {
      return NextResponse.json(
        {
          error: "Too many preview requests. Please try again later.",
          resetAt,
        },
        { status: 429 }
      );
    }

    // Insert preview job — subscriber_id uses sentinel 'preview' (NOT NULL in schema)
    const { data: job, error: insertError } = await supabase
      .from("brief_jobs")
      .insert({
        subscriber_id: "preview",
        status: "pending",
        job_type: "preview",
        preview_subject: subject,
      })
      .select("id")
      .single();

    if (insertError || !job) {
      console.error("[preview-story] Failed to insert job:", insertError);
      return NextResponse.json(
        { error: "Failed to queue preview" },
        { status: 500 }
      );
    }

    return NextResponse.json({ jobId: job.id }, { status: 202 });
  } catch (err) {
    console.error("[preview-story POST] Unhandled error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// GET /api/preview-story?jobId=xxx — poll job status
// ---------------------------------------------------------------------------

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");

    if (!jobId) {
      return NextResponse.json(
        { error: "jobId query parameter is required" },
        { status: 400 }
      );
    }

    const { data: job, error } = await supabase
      .from("brief_jobs")
      .select("id, status, result, error")
      .eq("id", jobId)
      .eq("job_type", "preview")
      .single();

    if (error || !job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (job.status === "complete" && job.result) {
      // result shape: { item: IntelItem, isFresh: boolean, publishedDate?: string }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = job.result as any;
      return NextResponse.json({
        status: "complete",
        // Handle legacy Warden result shape (pre-fix, IntelItem stored directly without .item wrapper)
        item: res?.item ?? (res?.headline ? res : null),
        isFresh: res?.isFresh ?? false, // default to false when absent — err on the side of showing the disclaimer banner rather than silently marking an unknown article as fresh
        publishedDate: res?.publishedDate ?? null,
      });
    }

    if (job.status === "error") {
      const errorMsg: string = job.error ?? "";
      if (errorMsg.includes("NO_RESULTS")) {
        return NextResponse.json({
          status: "no_results",
          message: "We couldn't find anything on that topic. Try a different one?",
        });
      }
      return NextResponse.json({
        status: "error",
        message: errorMsg,
      });
    }

    return NextResponse.json({ status: job.status });
  } catch (err) {
    console.error("[preview-story GET] Unhandled error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
