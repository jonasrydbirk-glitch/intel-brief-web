import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { generateBrief } from "@/engine/brief-generator";

export async function POST(request: Request) {
  try {
    // Admin auth check
    const cookieStore = await cookies();
    const session = cookieStore.get("admin_session");
    if (!session || session.value !== "authenticated") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { subscriberId } = await request.json();
    if (!subscriberId) {
      return NextResponse.json(
        { error: "subscriberId is required" },
        { status: 400 }
      );
    }

    const brief = await generateBrief(subscriberId);
    return NextResponse.json({ brief });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
