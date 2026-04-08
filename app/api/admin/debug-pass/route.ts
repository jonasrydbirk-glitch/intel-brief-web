import { NextResponse } from "next/server";
import { createHash } from "crypto";

/**
 * Diagnostic endpoint — reveals the ADMIN_PASSWORD's length, sha256 hash,
 * and whether invisible characters were present, WITHOUT exposing the value.
 *
 * Compare the hash against:
 *   echo -n "yourpassword" | sha256sum
 *
 * TODO: Remove this endpoint once the login issue is resolved.
 */
export async function GET() {
  const raw = process.env.ADMIN_PASSWORD;

  if (raw === undefined) {
    console.error("[CRITICAL] ADMIN_PASSWORD is not defined in the environment");
    return NextResponse.json(
      {
        defined: false,
        message: "ADMIN_PASSWORD is NOT set in the environment",
      },
      { status: 500 }
    );
  }

  const trimmed = raw.trim();
  const sanitized = raw
    .replace(/[\u200B-\u200D\uFEFF\u00A0\u0000-\u001F\u007F]/g, "")
    .trim();

  const rawHash = createHash("sha256").update(raw).digest("hex");
  const sanitizedHash = createHash("sha256").update(sanitized).digest("hex");

  // Character-code dump of invisible extras (if any)
  const invisibles = raw
    .split("")
    .filter((ch) => /[\u200B-\u200D\uFEFF\u00A0\u0000-\u001F\u007F\s]/.test(ch) && ch !== " ")
    .map((ch) => `U+${ch.charCodeAt(0).toString(16).padStart(4, "0")}`);

  // Hex dump of every char so we can see exactly what's stored
  const charDump = raw.split("").map((ch, i) => ({
    index: i,
    char: ch.charCodeAt(0) >= 32 && ch.charCodeAt(0) < 127 ? ch : "?",
    code: `U+${ch.charCodeAt(0).toString(16).padStart(4, "0")}`,
  }));

  // Also check ADMIN_OVERRIDE
  const overrideRaw = process.env.ADMIN_OVERRIDE;
  const overrideDefined = overrideRaw !== undefined;

  return NextResponse.json({
    defined: true,
    raw_length: raw.length,
    trimmed_length: trimmed.length,
    sanitized_length: sanitized.length,
    has_invisible_chars: invisibles.length > 0,
    invisible_char_codes: invisibles,
    char_dump: charDump,
    raw_sha256: rawHash,
    sanitized_sha256: sanitizedHash,
    hashes_match: rawHash === sanitizedHash,
    override_defined: overrideDefined,
    override_length: overrideDefined ? overrideRaw!.length : null,
    hint: "Compare sanitized_sha256 against: echo -n 'yourpassword' | sha256sum",
  });
}
