import { NextResponse } from "next/server";
import { getSupabaseUrl, getSupabaseKey, supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  const results: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    runtime: process.version,
    platform: process.platform,
    arch: process.arch,
  };

  // 1. Environment variable check (masked)
  const url = getSupabaseUrl();
  const key = getSupabaseKey();
  results.env = {
    SUPABASE_URL_set: !!process.env.SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_URL_set: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_ANON_KEY_set: !!process.env.SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SUPABASE_ANON_KEY_set:
      !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    resolved_url: url ? `${url.slice(0, 30)}…` : "(empty)",
    resolved_key_length: key.length,
    url_starts_with_https: url.startsWith("https://"),
    url_has_double_protocol: /^https?:\/\/https?:\/\//.test(
      process.env.SUPABASE_URL ??
        process.env.NEXT_PUBLIC_SUPABASE_URL ??
        ""
    ),
  };

  // 2. DNS resolution test
  try {
    const hostname = new URL(url).hostname;
    const dns = await import("dns");
    const { resolve4 } = dns.promises;
    const addresses = await resolve4(hostname);
    results.dns = { ok: true, hostname, addresses };
  } catch (err: unknown) {
    results.dns = {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  // 3. Raw fetch to Supabase REST endpoint (healthcheck)
  try {
    const start = Date.now();
    const res = await fetch(`${url}/rest/v1/`, {
      method: "HEAD",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
      signal: AbortSignal.timeout(10_000),
    });
    results.raw_fetch = {
      ok: true,
      status: res.status,
      statusText: res.statusText,
      latency_ms: Date.now() - start,
      content_type: res.headers.get("content-type"),
      server: res.headers.get("server"),
    };
  } catch (err: unknown) {
    results.raw_fetch = {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      name: err instanceof Error ? err.name : undefined,
      cause:
        err instanceof Error && "cause" in err
          ? String(err.cause)
          : undefined,
    };
  }

  // 4. Supabase client query (select 1 row from subscribers, limited)
  try {
    const start = Date.now();
    const { data, error } = await supabase
      .from("subscribers")
      .select("id")
      .limit(1);
    results.supabase_query = {
      ok: !error,
      latency_ms: Date.now() - start,
      data_length: data?.length ?? null,
      error: error
        ? { message: error.message, code: error.code, details: error.details }
        : null,
    };
  } catch (err: unknown) {
    results.supabase_query = {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      name: err instanceof Error ? err.name : undefined,
    };
  }

  return NextResponse.json(results, {
    headers: { "Cache-Control": "no-store" },
  });
}
