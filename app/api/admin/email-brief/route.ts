import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import type { BriefPayload } from "@/engine/brief-generator";
import { renderBriefPdf } from "@/lib/render-pdf";
import { sendEmail } from "@/lib/delivery";
import { supabase } from "@/lib/supabase";

// PDF render + email is fast — 30 s is plenty
export const maxDuration = 30;

/**
 * POST /api/admin/email-brief
 *
 * Accepts a pre-generated BriefPayload and:
 *   1. Renders it to PDF
 *   2. Emails the PDF to the subscriber
 *   3. Records the report in Supabase
 *
 * Body: { subscriberId: string, brief: BriefPayload }
 */
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("admin_session");
    if (!session || session.value !== "authenticated") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { subscriberId, brief } = (await request.json()) as {
      subscriberId: string;
      brief: BriefPayload;
    };

    if (!subscriberId || !brief) {
      return NextResponse.json(
        { error: "subscriberId and brief are required" },
        { status: 400 }
      );
    }

    // Look up subscriber email
    const { data: subscriber, error: subErr } = await supabase
      .from("subscribers")
      .select("email, fullName")
      .eq("id", subscriberId)
      .single();

    if (subErr || !subscriber?.email) {
      return NextResponse.json(
        { error: `Subscriber not found or missing email: ${subErr?.message ?? "no email"}` },
        { status: 404 }
      );
    }

    // Render to PDF
    const pdfBuffer = await renderBriefPdf(brief);
    const pdfBase64 = pdfBuffer.toString("base64");

    // Build the email
    const dateStr = new Date().toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const subject = `Your IQsea Intel Brief - ${dateStr}`;

    const htmlBody = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;color:#1e293b;">
        <div style="text-align:center;padding:24px 0 16px;border-bottom:2px solid #0ea5e9;">
          <div style="font-size:24px;font-weight:800;color:#0c4a6e;letter-spacing:0.04em;">IQsea</div>
          <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.12em;">Intelligence Brief</div>
        </div>
        <div style="padding:24px 0;">
          <p style="font-size:15px;line-height:1.6;">Hi ${subscriber.fullName || "there"},</p>
          <p style="font-size:15px;line-height:1.6;margin-top:12px;">
            Your latest intelligence brief is attached as a PDF. This report was generated on ${dateStr}
            and covers the latest developments relevant to your profile.
          </p>
          <p style="font-size:15px;line-height:1.6;margin-top:12px;">
            Open the attached PDF for the full analysis.
          </p>
        </div>
        <div style="padding-top:16px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;text-align:center;">
          IQsea Intel Engine &middot; Confidential
        </div>
      </div>
    `;

    const pdfFilename = `IQsea-Intel-Brief-${dateStr.replace(/\s+/g, "-")}.pdf`;

    await sendEmail({
      to: subscriber.email,
      from: "brief@iqsea.io",
      subject,
      htmlBody,
      attachments: [
        {
          filename: pdfFilename,
          contentBytes: pdfBase64,
          contentType: "application/pdf",
        },
      ],
    });

    // Save report record
    await supabase.from("reports").insert({
      user_id: subscriberId,
      type: "daily",
      status: "delivered",
      subject,
      generated_at: new Date().toISOString(),
      pdf_url: null,
    });

    return NextResponse.json({
      success: true,
      message: `Brief emailed to ${subscriber.email}`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = message.includes("403") || message.includes("Authorization_RequestDenied")
      ? 403
      : 500;
    const error = status === 403
      ? "Azure Permissions Required: The M365 app registration is missing Mail.Send permission. Grant it in Azure AD > App registrations > API permissions."
      : message;
    return new Response(JSON.stringify({ error }), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }
}
