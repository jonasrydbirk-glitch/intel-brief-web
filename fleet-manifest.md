# IQsea Intel Engine — Fleet Manifest

## Agent Roster

| Callsign   | Role                         | Model                          | Provider   |
|------------|------------------------------|--------------------------------|------------|
| **Scout**  | Search query generation      | MiniMax-M1                     | Minimax    |
| **Architect** | Intelligence synthesis    | Claude Sonnet 4.6 (`claude-sonnet-4-6-20250514`) | Anthropic  |
| **Scribe** | Output formatting (JSON→PDF) | Deterministic (no LLM)        | Local      |

## Pipeline Flow

```
Supabase (subscriber profile)
  └─▶ Scout (Minimax M1)        — generates 5-8 targeted search queries
       └─▶ Architect (Sonnet 4.6) — synthesises findings through "Marine Engineer" lens
            └─▶ Scribe            — normalises JSON for the PDF template
                 └─▶ /api/print/generate-sample — renders branded HTML/PDF
```

## Environment Variables Required

| Variable              | Purpose                              |
|-----------------------|--------------------------------------|
| `NEXT_PUBLIC_SUPABASE_URL`  | Supabase project URL            |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key      |
| `MINIMAX_API_KEY`     | Minimax API key for M1 model         |
| `MINIMAX_BASE_URL`    | Minimax API base URL (optional)      |
| `ANTHROPIC_API_KEY`   | Anthropic API key for Claude Sonnet  |

## Phase 1 Scope (Local PoC)

- Single-subscriber brief generation via CLI: `npx tsx engine/brief-generator.ts <sub_id>`
- Sample PDF preview via GET `/api/print/generate-sample`
- POST `/api/print/generate-sample` accepts `BriefPayload` JSON, returns branded HTML
