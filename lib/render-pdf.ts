/**
 * IQsea PDF Renderer
 *
 * Uses puppeteer-core + @sparticuz/chromium for Vercel serverless compatibility.
 * Renders the brief HTML locally via lib/brief-html.ts — NO network fetch needed.
 *
 * Build 2026-04-08-JET-PDF-FIX: Eliminated the localhost fetch loop that broke
 * Direct Dispatch mode on the Beelink. HTML is now generated in-process.
 */

import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import type { BriefPayload } from "@/engine/brief-generator";
import { renderBriefHtml, renderMonthlyBriefHtml } from "@/lib/brief-html";

/**
 * Render a BriefPayload to a PDF buffer.
 *
 * 1. Generates styled HTML locally (no network call).
 * 2. Opens the HTML in a headless browser.
 * 3. Prints to PDF and returns the buffer.
 */
export async function renderBriefPdf(brief: BriefPayload): Promise<Buffer> {
  // Step 1: Generate HTML in-process — route monthly briefs to their own template
  const html = brief.briefType === "monthly"
    ? renderMonthlyBriefHtml(brief)
    : renderBriefHtml(brief, brief.depth);

  // Step 2: Launch headless browser
  // On the Beelink (Windows/local), use the Puppeteer-managed Chrome install.
  // On Vercel (serverless), fall back to @sparticuz/chromium.
  const isLocal = !process.env.AWS_LAMBDA_FUNCTION_NAME;
  const executablePath = isLocal
    ? "C:/Users/Atlas/.cache/puppeteer/chrome/win64-146.0.7680.153/chrome-win64/chrome.exe"
    : await chromium.executablePath();

  const browser = await puppeteer.launch({
    args: [
      ...(isLocal ? [] : chromium.args),
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-logging",
      "--log-level=3",
    ],
    defaultViewport: chromium.defaultViewport,
    executablePath,
    headless: isLocal ? true : chromium.headless,
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
