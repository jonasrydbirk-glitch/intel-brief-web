/**
 * OpenAI embedding client via OpenRouter.
 *
 * Calls the OpenRouter embeddings endpoint with model
 * `openai/text-embedding-3-small`, which returns 1536-dimensional vectors.
 * Uses the same OPENROUTER_API_KEY already in .env.
 *
 * Returns null on any error — callers should skip the row rather than crash.
 */

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const EMBEDDING_MODEL = "openai/text-embedding-3-small";
const TIMEOUT_MS = 10_000;

export const EMBEDDING_DIMENSIONS = 1536;

// ---------------------------------------------------------------------------
// Response shape
// ---------------------------------------------------------------------------

interface EmbeddingResponse {
  data: Array<{
    embedding: number[];
    index: number;
    object: string;
  }>;
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

// ---------------------------------------------------------------------------
// generateEmbedding
// ---------------------------------------------------------------------------

/**
 * Embed a text string using OpenAI text-embedding-3-small via OpenRouter.
 *
 * Returns a 1536-dimensional number[] on success, or null on any error
 * (missing key, HTTP error, unexpected response shape, timeout).
 */
export async function generateEmbedding(text: string): Promise<number[] | null> {
  const apiKey = process.env.OPENROUTER_API_KEY ?? "";

  if (!apiKey) {
    console.warn("[Embeddings] OPENROUTER_API_KEY not set — skipping embedding.");
    return null;
  }

  if (!text.trim()) {
    console.warn("[Embeddings] Empty input text — skipping.");
    return null;
  }

  let resp: Response;
  try {
    resp = await fetch(`${OPENROUTER_BASE_URL}/embeddings`, {
      method: "POST",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: text,
      }),
    });
  } catch (err) {
    console.warn(
      `[Embeddings] Fetch failed: ${err instanceof Error ? err.message : String(err)}`
    );
    return null;
  }

  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    console.warn(
      `[Embeddings] HTTP ${resp.status} from OpenRouter: ${body.slice(0, 200)}`
    );
    return null;
  }

  let json: EmbeddingResponse;
  try {
    json = (await resp.json()) as EmbeddingResponse;
  } catch (err) {
    console.warn(
      `[Embeddings] JSON parse failed: ${err instanceof Error ? err.message : String(err)}`
    );
    return null;
  }

  const vector = json?.data?.[0]?.embedding;

  if (!Array.isArray(vector)) {
    console.warn("[Embeddings] Response missing data[0].embedding array.");
    return null;
  }

  if (vector.length !== EMBEDDING_DIMENSIONS) {
    console.warn(
      `[Embeddings] Unexpected vector dimensions: got ${vector.length}, expected ${EMBEDDING_DIMENSIONS}.`
    );
    return null;
  }

  return vector;
}
