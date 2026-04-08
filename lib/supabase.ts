import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

const TIMEOUT_MS = 30_000;

function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  return fetch(input, {
    ...init,
    signal: controller.signal,
  }).finally(() => clearTimeout(timer));
}

export function getSupabaseUrl(): string {
  const raw =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  // Strip any accidental double-protocol prefix (https://https://…)
  return raw.replace(/^https?:\/\/(https?:\/\/)/, "$1");
}

export function getSupabaseKey(): string {
  return (
    process.env.SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    ""
  );
}

function getSupabaseClient(): SupabaseClient {
  if (_client) return _client;

  const supabaseUrl = getSupabaseUrl();
  const supabaseKey = getSupabaseKey();

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Missing Supabase environment variables. " +
        "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY " +
        "(or SUPABASE_URL and SUPABASE_ANON_KEY)."
    );
  }

  _client = createClient(supabaseUrl, supabaseKey, {
    global: {
      fetch: fetchWithTimeout,
      headers: { "x-my-custom-header": "iqsea-vercel" },
    },
    db: { schema: "public" },
    auth: { persistSession: false },
  });
  return _client;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const client = getSupabaseClient();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
