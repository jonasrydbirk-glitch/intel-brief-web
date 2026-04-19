/**
 * Shared JSON cleaning & parsing utilities.
 *
 * These are used by both the engine (brief-generator) and API routes
 * to ensure consistent handling of LLM-produced JSON.
 */

// ---------------------------------------------------------------------------
// JSON Repair — aggressive fix-up for common LLM JSON failures
// ---------------------------------------------------------------------------

/**
 * Attempt to repair broken JSON from LLM output. Handles:
 * - Trailing commas before } or ]
 * - Truncated responses (missing closing braces/brackets)
 * - Unescaped control characters inside strings
 */
export function repairJSON(raw: string): string {
  let s = raw;

  // 1. Strip trailing commas before } or ] (with optional whitespace)
  s = s.replace(/,\s*([\]}])/g, "$1");

  // 2. Escape unescaped control characters inside string values
  s = s.replace(/[\x00-\x1F]/g, (ch) => {
    if (ch === "\n") return "\\n";
    if (ch === "\r") return "\\r";
    if (ch === "\t") return "\\t";
    return "";
  });

  // 3. Fix truncated JSON — count unmatched braces/brackets and close them
  let braces = 0;
  let brackets = 0;
  let inString = false;
  let escaped = false;
  for (const ch of s) {
    if (escaped) { escaped = false; continue; }
    if (ch === "\\") { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{") braces++;
    else if (ch === "}") braces--;
    else if (ch === "[") brackets++;
    else if (ch === "]") brackets--;
  }

  // If we ended inside a string, close it
  if (inString) s += '"';

  // Append missing closing brackets/braces
  while (brackets > 0) { s += "]"; brackets--; }
  while (braces > 0) { s += "}"; braces--; }

  // 4. One more pass to strip trailing commas that may have appeared before new closers
  s = s.replace(/,\s*([\]}])/g, "$1");

  return s;
}

// ---------------------------------------------------------------------------
// Emoji / Unicode stripping
// ---------------------------------------------------------------------------

/**
 * Strip emojis and decorative Unicode symbols from a string.
 * Covers Emoji_Presentation, Emoji_Modifier, Dingbats, Symbols, etc.
 * Leaves standard punctuation, currency symbols, and Latin/Greek/Cyrillic intact.
 */
export function stripEmojis(str: string): string {
  return str
    .replace(/[\u{1F600}-\u{1F64F}]/gu, "")   // Emoticons
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, "")   // Misc Symbols & Pictographs
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, "")   // Transport & Map
    .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, "")   // Flags
    .replace(/[\u{2600}-\u{26FF}]/gu, "")      // Misc Symbols
    .replace(/[\u{2700}-\u{27BF}]/gu, "")      // Dingbats
    .replace(/[\u{FE00}-\u{FE0F}]/gu, "")      // Variation Selectors
    .replace(/[\u{1F900}-\u{1F9FF}]/gu, "")   // Supplemental Symbols
    .replace(/[\u{1FA00}-\u{1FA6F}]/gu, "")   // Chess Symbols
    .replace(/[\u{1FA70}-\u{1FAFF}]/gu, "")   // Symbols Extended-A
    .replace(/[\u{200D}]/gu, "")               // Zero Width Joiner
    .replace(/[\u{20E3}]/gu, "")               // Combining Enclosing Keycap
    .replace(/\s{2,}/g, " ")                    // Collapse double spaces from removals
    .trim();
}

// ---------------------------------------------------------------------------
// IntelItem sanitisation
// ---------------------------------------------------------------------------

export interface IntelItem {
  headline: string;
  summary: string;
  commentary: string;
  relevance: string;
  source: string;
  /**
   * Secondary source URL — populated when this item draws content from two
   * different search results. Both URLs must appear in the search metadata.
   */
  secondarySource?: string;
  /** Verbatim pull-quote from the source article. Optional — preserved as-is
   *  (no emoji stripping) so the exact words from the original source are kept. */
  quote?: string;
}

/** Sanitise an IntelItem — strip emojis from all text fields.
 *  The `quote` field is preserved verbatim (no emoji stripping) because it
 *  must remain an exact copy of the original source text. */
export function sanitiseItem(item: IntelItem): IntelItem {
  return {
    headline: stripEmojis(item.headline ?? ""),
    summary: stripEmojis(item.summary ?? ""),
    commentary: stripEmojis(item.commentary ?? ""),
    relevance: stripEmojis(item.relevance ?? ""),
    source: stripEmojis(item.source ?? ""),
    // Preserve optional fields only when present
    ...(item.secondarySource?.trim() ? { secondarySource: item.secondarySource.trim() } : {}),
    ...(item.quote?.trim() ? { quote: item.quote.trim() } : {}),
  };
}

// ---------------------------------------------------------------------------
// Safe JSON parse with repair fallback
// ---------------------------------------------------------------------------

/**
 * Parse a JSON string, attempting repair if the first parse fails.
 *
 * Returns null on any unrecoverable failure — callers must handle null
 * explicitly rather than receiving a silent empty object.
 *
 * Defences:
 *  1. Empty / null / undefined / whitespace-only → returns null
 *  2. Markdown fence stripping (```json ... ```)
 *  3. Brace extraction (find outermost { … })
 *  4. repairJSON() for trailing-comma / truncation / control-char issues
 *  5. Final fallback → returns null instead of throwing
 */
export function safeParseJSON<T = unknown>(raw: string): T | null {
  // Guard: empty, null, undefined, or whitespace-only input
  if (!raw || !raw.trim()) {
    return null;
  }

  let s = raw.trim();

  // Strip markdown fences that models love to add.
  // Use a GREEDY match so that if the response has both opening and closing
  // fences, we capture the entire content between them (not just up to the
  // first triple-backtick inside the JSON, which shouldn't exist but
  // defensiveness costs nothing here).
  const fence = s.match(/```(?:json)?\s*([\s\S]*)```\s*$/);
  if (fence) {
    s = fence[1].trim();
  } else if (s.startsWith("```")) {
    // Truncated response: opening fence present but no closing fence.
    // Strip the opening fence and any language tag, then rely on brace
    // extraction + repairJSON to recover what we can.
    s = s.replace(/^```(?:json)?\s*/, "").trim();
  }

  // Strip any remaining backticks (stray decorators)
  s = s.replace(/`/g, "");

  // Extract outermost JSON object if surrounded by prose
  const firstBrace = s.indexOf("{");
  const lastBrace = s.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    s = s.substring(firstBrace, lastBrace + 1);
  }

  // If we still have nothing parseable, bail early
  if (!s || s === "{" || s === "}") {
    return null;
  }

  // Attempt 1: strict parse
  try {
    return JSON.parse(s) as T;
  } catch {
    // Attempt 2: aggressive repair, then parse
    try {
      const repaired = repairJSON(s);
      return JSON.parse(repaired) as T;
    } catch {
      return null;
    }
  }
}
