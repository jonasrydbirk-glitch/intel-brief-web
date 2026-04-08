import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { after } from "next/server";
import { nanoid } from "nanoid";
import { generateBrief } from "@/engine/brief-generator";
import { supabase } from "@/lib/supabase";

// Allow the after() callback up to 300 s (Vercel Pro / Enterprise).
// On Hobby plans the ceiling is lower — the job will still run but may
// be cut short if generation exceeds the plan limit.
export const maxDuration = 300;

/**
 * POST /api/admin/brief-job
 *
 * Starts a background brief-generation job and returns immediately
 * with a 202 Accepted + jobId.  The heavy work runs in an after()
 * callback so the HTTP response is instant.
 *
 * Body: { subscriberId: string }
 * Response: { jobId: string }
 */
export async function POST(request: Request) {
  // Admin auth
  const cookieStore = await cookies();
  const session = cookieStore.get("admin_session");
  if (!session || session.value !== "authenticated") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { subscriberId } = await request.json();
  if (!subscriberId) {
    return NextResponse.json(
      { error: "subscriberId is required" },
      { status: 400 }
    );
  }

  const jobId = nanoid(12);

  // Create the job row (status: pending)
  const { error: insertErr } = await supabase.from("brief_jobs").insert({
    id: jobId,
    subscriber_id: subscriberId,
    status: "pending",
  });

  if (insertErr) {
    if (insertErr.message.includes("relation") || insertErr.message.includes("does not exist") || insertErr.code === "42P01") {
      return NextResponse.json(
        { error: "Database Setup Required: the 'brief_jobs' table does not exist. Run the migration in migrations/001_brief_jobs.sql via the Supabase SQL Editor." },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: `Failed to create job: ${insertErr.message}` },
      { status: 500 }
    );
  }

  // Schedule the heavy work to run after the response is sent.
  // The function invocation stays alive (up to maxDuration) while
  // this callback executes.
  after(async () => {
    try {
      await supabase
        .from("brief_jobs")
        .update({ status: "running" })
        .eq("id", jobId);

      const brief = await generateBrief(subscriberId);

      await supabase
        .from("brief_jobs")
        .update({ status: "complete", result: brief })
        .eq("id", jobId);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      await supabase
        .from("brief_jobs")
        .update({ status: "error", error: message })
        .eq("id", jobId);
    }
  });

  return NextResponse.json({ jobId }, { status: 202 });
}

/**
 * GET /api/admin/brief-job?jobId=xxx
 *
 * Poll for job status.  Returns the current state of the job:
 *   - pending  → generation has not started yet
 *   - running  → Scout / Architect / Scribe pipeline in progress
 *   - complete → brief is in the `result` field
 *   - error    → see the `error` field
 */
export async function GET(request: Request) {
  const cookieStore = await cookies();
  const session = cookieStore.get("admin_session");
  if (!session || session.value !== "authenticated") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("jobId");

  if (!jobId) {
    return NextResponse.json(
      { error: "jobId query parameter is required" },
      { status: 400 }
    );
  }

  const { data, error: fetchErr } = await supabase
    .from("brief_jobs")
    .select("id, subscriber_id, status, result, error, created_at, updated_at")
    .eq("id", jobId)
    .single();

  if (fetchErr) {
    if (fetchErr.message.includes("relation") || fetchErr.message.includes("does not exist") || fetchErr.code === "42P01") {
      return NextResponse.json(
        { error: "Database Setup Required: the 'brief_jobs' table does not exist. Run the migration in migrations/001_brief_jobs.sql via the Supabase SQL Editor." },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: "Job not found" },
      { status: 404 }
    );
  }

  if (!data) {
    return NextResponse.json(
      { error: "Job not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(data);
}
