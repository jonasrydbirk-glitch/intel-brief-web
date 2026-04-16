# Heartbeat Monitor Setup

## What's already done (code is live on main)

| Component | Status |
|-----------|--------|
| `migrations/008_heartbeats.sql` | ✅ Run this in Supabase SQL Editor |
| Warden heartbeat write | ✅ Writes every 5 min — effective on next Warden restart |
| `/api/health` endpoint | ✅ Returns 200 (alive) or 503 (stale/down) |
| Admin dashboard card | ✅ Visible on `/admin/intel-health` once Warden restarts |

---

## Step 1 — Run the migration (2 min)

Open Supabase → SQL Editor → New query → paste and run:

```sql
CREATE TABLE IF NOT EXISTS heartbeats (
  service   TEXT        PRIMARY KEY,
  last_beat TIMESTAMPTZ NOT NULL,
  metadata  JSONB       NOT NULL DEFAULT '{}'::jsonb
);
```

(The file is at `migrations/008_heartbeats.sql` in the repo.)

---

## Step 2 — Restart Warden to pick up the heartbeat code (1 min)

SSH into the Beelink or open a terminal and run:

```
pm2 restart warden
```

Within 5 minutes the first heartbeat will appear in the `heartbeats` table
and `/api/health` will return 200.

---

## Step 3 — Set up external monitoring (5 min, free)

### Option A: UptimeRobot (recommended — free plan: 50 monitors, 5-min intervals)

1. Sign up at https://uptimerobot.com (free)
2. Add new monitor:
   - **Monitor type:** HTTP(s)
   - **Friendly name:** IQsea Warden
   - **URL:** `https://iqsea.io/api/health`
   - **Monitoring interval:** 5 minutes
3. Set alert contact: your email
4. Save

UptimeRobot will email you within 5 minutes of Warden going down.

### Option B: Cronitor / Better Uptime / Pingdom

Same concept — point any HTTP monitor at `https://iqsea.io/api/health`.
The endpoint returns 503 when Warden hasn't heartbeated in 15+ minutes,
which triggers a standard downtime alert.

---

## How it works

```
Warden (Beelink)
  ↓ every 5 min: upserts heartbeats row
  
/api/health (Vercel)
  ↓ reads heartbeat, checks age < 15 min
  → 200 OK   (alive)
  → 503 Fail (stale or no data)
  
UptimeRobot
  ↓ polls /api/health every 5 min
  → emails you if 503
```

The 15-minute threshold gives 3 missed beats before the alarm fires —
enough headroom for a Beelink reboot (takes ~2 min).

---

## Verify it's working

```bash
curl -s https://iqsea.io/api/health | jq .
```

You should see something like:
```json
{
  "warden": {
    "alive": true,
    "last_beat": "2026-04-16T04:12:33.000Z",
    "age_seconds": 142,
    "uptime_seconds": 86400,
    "registered_sources": 21,
    "node_version": "v20.x.x"
  },
  "library": {
    "total_items": 4821,
    "items_last_24h": 87,
    "extraction_coverage_pct": 73,
    "embedding_coverage_pct": 68
  },
  "delivery": {
    "briefs_sent_24h": 1,
    "errors_24h": 0
  },
  "checked_at": "2026-04-16T04:14:55.000Z"
}
```
