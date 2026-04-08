/**
 * IQsea PDF Renderer
 *
 * Uses puppeteer-core + @sparticuz/chromium for Vercel serverless compatibility.
 * Converts the brief HTML (from /api/print/generate-sample) into a PDF buffer
 * suitable for email attachment.
 */

import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
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
  baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
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

  // Step 2: Launch headless browser with @sparticuz/chromium for serverless
  const browser = await puppeteer.launch({
    args: [...chromium.args, "--disable-logging", "--log-level=3"],
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
    dumpio: false,
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
