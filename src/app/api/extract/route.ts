import { NextRequest, NextResponse } from "next/server";
import { extractBlocks } from "@/lib/anthropic";

export const runtime = "nodejs";

/**
 * POST /api/extract — re-run extraction on a passage of prose and return fresh
 * blocks (does not persist; the caller decides what to do with them).
 */
export async function POST(req: NextRequest) {
  let body: { prose?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const prose = (body.prose ?? "").trim();
  if (!prose) {
    return NextResponse.json({ error: "Prose is required." }, { status: 400 });
  }

  try {
    const blocks = await extractBlocks(prose);
    return NextResponse.json({ blocks });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
