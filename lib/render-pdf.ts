/**
 * IQsea PDF Renderer
 *
 * Uses Puppeteer to convert the brief HTML (from /api/print/generate-sample)
 * into a PDF buffer suitable for email attachment.
 */

import puppeteer from "puppeteer";
import type { BriefPayload } from "@/engine/brief-generator";

/**
 * Render a BriefPayload to a PDF buffer.
 *
 * 1. POSTs the brief JSON to /api/print/generate-sample to get styled HTML.
 * 2. Opens the HTML in a headless browser.
 * 3. Prints to PDF and returns the buffer.
 *
 * @param brief  The complete BriefPayload from the engine.
 * @param baseUrl  The origin of the running Next.js server (default: http://localhost:3000).
 */
export async function renderBriefPdf(
  brief: BriefPayload,
  baseUrl = "http://localhost:3000"
): Promise<Buffer> {
  // Step 1: Get the styled HTML from the print endpoint
  const htmlRes = await fetch(`${baseUrl}/api/print/generate-sample`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(brief),
  });

  if (!htmlRes.ok) {
    const text = await htmlRes.text();
    throw new Error(`Print endpoint returned ${htmlRes.status}: ${text}`);
  }

  const html = await htmlRes.text();

  // Step 2: Launch headless browser and render
  const browser = await puppeteer.launch({
    headless: true,
    dumpio: false, // Suppress all browser stdout/stderr (prevents JSON corruption)
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    // Step 3: Generate PDF
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "16mm", bottom: "16mm", left: "12mm", right: "12mm" },
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}
