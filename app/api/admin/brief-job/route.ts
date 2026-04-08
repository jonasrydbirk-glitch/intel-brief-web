import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabase } from "@/lib/supabase";

/**
 * POST /api/admin/brief-job
 *
 * Inserts a "pending" row into brief_jobs and returns immediately
 * with a 202 Accepted + jobId.  The Warden engine on the Beelink
 * polls for pending rows and executes the heavy generation work.
 *
 * This avoids the "Serverless Kill" problem where Vercel terminates
 * the function before the pipeline completes.
 *
 * Body: { subscriberId: string }
 * Response: { jobId: string }
 */
export async function POST(request: Request) {
  try {
    // Admin auth
    const cookieStore = await cookies();
    const session = cookieStore.get("admin_session");
    if (!session || session.value !== "authenticated") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: { subscriberId?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const { subscriberId } = body;
    if (!subscriberId) {
      return NextResponse.json(
        { error: "subscriberId is required" },
        { status: 400 }
      );
    }

    // Create the job row (status: pending).
    // The Warden on the Beelink will pick this up within ~10 seconds.
    let jobId: string;
    try {
      const { data: insertData, error: insertErr } = await supabase
        .from("brief_jobs")
        .insert({
          subscriber_id: subscriberId,
          status: "pending",
        })
        .select("id")
        .single();

      if (insertErr) {
        if (insertErr.message.includes("relation") || insertErr.message.includes("does not exist") || insertErr.code === "42P01") {
          return NextResponse.json(
            { error: "Database Setup Required: the 'brief_jobs' table does not exist. Run the migration in migrations/001_brief_jobs.sql via the Supabase SQL Editor." },
            { status: 503 }
          );
        }
        return NextResponse.json(
          { error: "Database insert failed", details: insertErr.message },
          { status: 500 }
        );
      }

      jobId = insertData.id;
    } catch (err) {
      return NextResponse.json(
        { error: "Database insert failed", details: err instanceof Error ? err.message : "Unknown error" },
        { status: 500 }
      );
    }

    return NextResponse.json({ jobId }, { status: 202 });
  } catch (outerErr) {
    return NextResponse.json(
      { error: "Internal server error", details: outerErr instanceof Error ? outerErr.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/brief-job?jobId=xxx
 *
 * Poll for job status.  Returns the current state of the job:
 *   - pending    → waiting for the Warden to pick up the job
 *   - processing → Scout / Architect / Scribe pipeline in progress
 *   - complete   → brief is in the `result` field
 *   - error      → see the `error` field
 */
export async function GET(request: Request) {
  try {
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
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error", details: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
