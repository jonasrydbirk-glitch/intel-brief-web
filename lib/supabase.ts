import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

const TIMEOUT_MS = 30_000;

function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  return globalThis
    .fetch(input, { ...init, signal: controller.signal })
    .finally(() => clearTimeout(timer));
}

const MAX_INIT_RETRIES = 3;

function getSupabaseClient(): SupabaseClient {
  if (_client) return _client;

  const supabaseUrl =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Missing Supabase environment variables. " +
        "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY " +
        "(or SUPABASE_URL and SUPABASE_ANON_KEY)."
    );
  }

  // Strip any accidental double-protocol prefix
  const cleanUrl = supabaseUrl.replace(/^https?:\/\/(https?:\/\/)/, "$1");

  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_INIT_RETRIES; attempt++) {
    try {
      _client = createClient(cleanUrl, supabaseKey, {
        global: {
          fetch: fetchWithTimeout,
          headers: { "x-my-custom-header": "iqsea-vercel" },
        },
        db: { schema: "public" },
        auth: { persistSession: false },
      });
      return _client;
    } catch (err) {
      lastError = err;
      _client = null;
    }
  }
  throw lastError;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const client = getSupabaseClient();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
