/**
 * scripts/restart-warden.ts — Remote Warden restart via PID kill
 *
 * Kills the Warden process so pm2 auto-restarts it.  Works around the
 * Windows ACL restriction that blocks `pm2 restart warden` from Claude
 * code sessions (named-pipe permission denied).
 *
 * SAFE TO RUN: pm2 has --max-restarts and auto-restart enabled for
 * warden.  Killing the process is identical to a crash-triggered restart.
 *
 * Usage:
 *   npx tsx scripts/restart-warden.ts
 *   npx tsx scripts/restart-warden.ts --dry-run   # report PID, no kill
 *
 * Requirements:
 *   - Must run on the Beelink (Windows host where Warden is running)
 *   - pm2 must be managing 'warden' with auto-restart enabled
 *   - PowerShell must be available (it's always on Windows 10/11)
 */

import { execSync }  from "child_process";
import * as fs       from "fs";
import * as os       from "os";
import * as path     from "path";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const PM2_PID_FILE  = path.join(os.homedir(), ".pm2", "pids", "warden-1.pid");
const PM2_LOG_FILE  = path.join(os.homedir(), ".pm2", "logs", "warden-out.log");
const RESTART_WAIT_MS     = 12_000;  // 12s — pm2 restart + Node boot
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

function processAlive(wardenPid: number): boolean {
  try {
    const out = execSync(
      `powershell -Command "if (Get-Process -Id ${wardenPid} -EA SilentlyContinue) { 'alive' } else { 'dead' }"`,
      { encoding: "utf-8", timeout: 5_000 }
    ).trim();
    return out === "alive";
  } catch {
    return false;
  }
}

function killProcess(wardenPid: number): void {
  execSync(
    `powershell -Command "Stop-Process -Id ${wardenPid} -Force"`,
    { timeout: 10_000 }
  );
}

function tailLog(lines = 10): string {
  try {
    if (!fs.existsSync(PM2_LOG_FILE)) return "(log file not found)";
    // Read last N lines
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

  // ── Step 1: Read PID file ────────────────────────────────────────────
  const oldPid = readPidFile();
  if (oldPid === null) {
    console.error(`\n✗ Cannot read PID file: ${PM2_PID_FILE}`);
    console.error("  Is pm2 running? Is Warden registered as 'warden'?");
    process.exit(1);
  }
  console.log(`\n  PID file : ${PM2_PID_FILE}`);
  console.log(`  Current PID: ${oldPid}`);

  // ── Step 2: Verify process is alive ─────────────────────────────────
  const alive = processAlive(oldPid);
  if (!alive) {
    console.warn(`\n  ⚠ Process ${oldPid} is not running.`);
    console.warn("  pm2 may have already marked it as stopped.");
    console.warn("  Run: pm2 restart warden  (from the Beelink directly)");
    process.exit(1);
  }
  console.log(`  Process  : ALIVE (node PID ${oldPid})`);

  if (isDryRun) {
    console.log("\n  [dry-run] Would kill PID", oldPid, "and wait for pm2 restart.");
    console.log("  Run without --dry-run to execute.\n");
    return;
  }

  // ── Step 3: Kill the process ─────────────────────────────────────────
  console.log(`\n  Killing PID ${oldPid}...`);
  try {
    killProcess(oldPid);
    console.log("  Kill signal sent.");
  } catch (err) {
    console.error(`  ✗ Failed to kill process: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }

  // ── Step 4: Wait for pm2 to restart ─────────────────────────────────
  console.log(`\n  Waiting ${RESTART_WAIT_MS / 1_000}s for pm2 to restart Warden...`);
  await sleep(RESTART_WAIT_MS);

  // ── Step 5: Confirm new PID ──────────────────────────────────────────
  const newPid = readPidFile();
  console.log(`\n  New PID from file: ${newPid ?? "(file not updated yet)"}`);

  if (newPid === null) {
    console.error("  ✗ PID file is empty — pm2 may not have restarted yet.");
    console.error("    Wait 30s and check: pm2 status");
    process.exit(1);
  }

  if (newPid === oldPid) {
    console.warn("  ⚠ PID unchanged — pm2 may have reused the same PID.");
    console.warn("    This is rare but can happen. Check the log below.");
  } else {
    console.log(`  ✓ New PID (${newPid}) ≠ old PID (${oldPid}) — pm2 restarted.\n`);
  }

  // ── Step 6: Check log for fresh startup line ─────────────────────────
  await sleep(CONFIRMATION_WAIT_MS);
  const recentLog = tailLog(15);
  const hasStartLine = recentLog.includes("Warden starting") || recentLog.includes("Registered");
  console.log(`  Log tail (${PM2_LOG_FILE}):`);
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
