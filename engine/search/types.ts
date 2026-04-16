/**
 * Shared search types used across the retrieval stack.
 *
 * SearchHit lives here (not in brief-generator.ts) to break the import cycle:
 *   brief-generator → retriever → tavily → (types, not brief-generator)
 *
 * brief-generator.ts re-exports SearchHit from here so all downstream imports
 * remain unchanged.
 */

export interface SearchHit {
  title: string;
  snippet: string;
  url: string;
}
