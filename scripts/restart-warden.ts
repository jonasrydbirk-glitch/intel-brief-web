/**
 * scripts/restart-warden.ts — Remote Warden restart via HTTP self-restart endpoint
 *
 * Sends a POST to Warden's local restart endpoint (http://127.0.0.1:9099/restart).
 * Warden receives the request, exits cleanly (process.exit(0)), and pm2 auto-restarts it.
 *
 * WHY NOT KILL BY PID:
 *   Warden runs under an elevated (Admin) pm2 process. Claude Code sessions are
 *   non-elevated. Windows UAC blocks cross-elevation process signals — Stop-Process,
 *   taskkill, and schtasks /RU SYSTEM all return "Access is denied" from a non-admin
 *   shell. HTTP/TCP connections cross this boundary freely.
 *
 * SAFE TO RUN: pm2 has --max-restarts and auto-restart enabled for warden.
 * Exiting cleanly is identical to a normal shutdown — pm2 brings it back within ~3s.
 *
 * Usage:
 *   npx tsx scripts/restart-warden.ts
 *   npx tsx scripts/restart-warden.ts --dry-run   # check endpoint health, no restart
 *
 * Requirements:
 *   - Must run on the Beelink (Windows host where Warden is running)
 *   - Warden must be running with the self-restart endpoint active (engine/warden.ts ≥ this commit)
 *   - pm2 must be managing 'warden' with auto-restart enabled
 *
 * Config (env vars, optional):
 *   WARDEN_RESTART_PORT    — port Warden listens on (default: 9099)
 *   WARDEN_RESTART_SECRET  — shared secret in x-restart-secret header (default: none)
 */

import * as fs   from "fs";
import * as path from "path";
import * as os   from "os";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const RESTART_PORT   = parseInt(process.env.WARDEN_RESTART_PORT   ?? "9099", 10);
const RESTART_SECRET = process.env.WARDEN_RESTART_SECRET ?? "";
const RESTART_URL    = `http://127.0.0.1:${RESTART_PORT}/restart`;

const PM2_PID_FILE   = path.join(os.homedir(), ".pm2", "pids", "warden-1.pid");
const PM2_LOG_FILE   = path.join(os.homedir(), ".pm2", "logs",  "warden-out.log");
const RESTART_WAIT_MS      = 10_000;  // 10s — pm2 restart + Node boot
const CONFIRMATION_WAIT_MS =  3_000;  //  3s — extra wait before log check

const isDryRun = process.argv.includes("--dry-run");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readPidFile(): number | null {
  try {
    const raw = fs.readFileSync(PM2_PID_FILE, "utf-8").trim();
    const n = parseInt(raw, 10);
    return isNaN(n) ? null : n;
  } catch {
    return null;
  }
}

function tailLog(lines = 15): string {
  try {
    if (!fs.existsSync(PM2_LOG_FILE)) return "(log file not found)";
    const content = fs.readFileSync(PM2_LOG_FILE, "utf-8");
    const all = content.split("\n").filter(Boolean);
    return all.slice(-lines).join("\n");
  } catch (err) {
    return `(could not read log: ${err instanceof Error ? err.message : String(err)})`;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log("=".repeat(60));
  console.log("  Warden Remote Restart" + (isDryRun ? "  [DRY RUN]" : ""));
  console.log("=".repeat(60));
  console.log(`\n  Endpoint : ${RESTART_URL}`);
  console.log(`  Auth     : ${RESTART_SECRET ? "secret header set" : "no secret (open)"}`);

  // ── Step 1: Read current PID ─────────────────────────────────────────
  const oldPid = readPidFile();
  console.log(`\n  PID file : ${PM2_PID_FILE}`);
  console.log(`  Old PID  : ${oldPid ?? "(not found)"}`);

  if (isDryRun) {
    // In dry-run mode, just probe the endpoint for a 200 (no restart)
    console.log("\n  [dry-run] Probing restart endpoint (GET — no actual restart)...");
    try {
      const probe = await fetch(RESTART_URL, { method: "GET" });
      console.log(`  Endpoint reachable — returned HTTP ${probe.status} (expected 404 for GET).`);
      if (probe.status === 404) {
        console.log("  ✓ Warden restart server is up and responding correctly.");
      }
    } catch (err) {
      console.error(`  ✗ Endpoint unreachable: ${err instanceof Error ? err.message : String(err)}`);
      console.error(`    Warden may not have the self-restart endpoint (needs this commit's warden.ts).`);
      console.error(`    Ask Jonas to run 'pm2 restart warden' once from an elevated terminal.`);
    }
    console.log("\n  Run without --dry-run to execute the restart.\n");
    return;
  }

  // ── Step 2: Send restart signal ──────────────────────────────────────
  console.log(`\n  Sending POST ${RESTART_URL} ...`);
  const headers: Record<string, string> = {};
  if (RESTART_SECRET) headers["x-restart-secret"] = RESTART_SECRET;

  let res: Response;
  try {
    res = await fetch(RESTART_URL, { method: "POST", headers });
  } catch (err) {
    console.error(`  ✗ Cannot reach Warden restart endpoint: ${err instanceof Error ? err.message : String(err)}`);
    console.error(`\n  Most likely cause: Warden is running an older build that does not have`);
    console.error(`  the self-restart endpoint. Ask Jonas to run once from an elevated terminal:`);
    console.error(`\n    pm2 restart warden\n`);
    console.error(`  After that one-time manual restart, this script will work for all future restarts.`);
    process.exit(1);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`  ✗ Warden returned ${res.status}: ${body}`);
    if (res.status === 403) {
      console.error("    Check WARDEN_RESTART_SECRET — it must match the value in Warden's env.");
    }
    process.exit(1);
  }

  const body = await res.text().catch(() => "");
  console.log(`  ✓ Restart signal accepted — Warden said: "${body.trim()}"`);

  // ── Step 3: Wait for pm2 to restart ─────────────────────────────────
  console.log(`\n  Waiting ${RESTART_WAIT_MS / 1_000}s for pm2 to restart Warden...`);
  await sleep(RESTART_WAIT_MS);

  // ── Step 4: Confirm new PID ──────────────────────────────────────────
  const newPid = readPidFile();
  console.log(`\n  New PID  : ${newPid ?? "(file not updated yet)"}`);

  if (newPid === null) {
    console.error("  ✗ PID file is empty — pm2 may not have restarted yet.");
    console.error("    Wait 30s and check: pm2 status");
    process.exit(1);
  }

  if (newPid === oldPid) {
    console.warn("  ⚠ PID unchanged — pm2 may have reused the same PID (rare but possible).");
    console.warn("    Check the log below to confirm fresh startup.");
  } else {
    console.log(`  ✓ New PID (${newPid}) ≠ old PID (${oldPid ?? "unknown"}) — pm2 restarted OK.`);
  }

  // ── Step 5: Check log for fresh startup line ─────────────────────────
  await sleep(CONFIRMATION_WAIT_MS);
  const recentLog = tailLog(15);
  const hasStartLine = recentLog.includes("Warden starting") || recentLog.includes("Registered");
  console.log(`\n  Log tail (${PM2_LOG_FILE}):`);
  console.log("  " + "-".repeat(56));
  recentLog.split("\n").forEach(line => console.log("  " + line));
  console.log("  " + "-".repeat(56));

  if (hasStartLine) {
    console.log("\n  ✓ Warden is running — startup message found in log.");
  } else {
    console.warn("\n  ⚠ Startup message not yet in log — may still be booting.");
    console.warn("    Check again in 10s: npx tsx scripts/restart-warden.ts --dry-run");
  }

  console.log("\n" + "=".repeat(60) + "\n");
}

main().catch(err => {
  console.error("Unhandled error:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
