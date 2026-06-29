import { NextRequest, NextResponse } from "next/server";
import { refineBlocks } from "@/lib/anthropic";
import { commitSessions } from "@/lib/git";
import { readSession, writeSession } from "@/lib/sessions";
import type { Block } from "@/lib/types";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ name: string }> };

/**
 * POST /api/sessions/[name]/refine — take the session's current blocks plus a
 * user comment, ask Claude for an updated structured set in the same format,
 * persist it, and commit with the comment as the message.
 */
export async function POST(req: NextRequest, { params }: Ctx) {
  const { name } = await params;

  let body: { comment?: string; blocks?: Block[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const comment = (body.comment ?? "").trim();
  if (!comment) {
    return NextResponse.json({ error: "Comment is required." }, { status: 400 });
  }
  if (!Array.isArray(body.blocks)) {
    return NextResponse.json(
      { error: "Body must include the current blocks." },
      { status: 400 },
    );
  }

  const session = await readSession(name);
  if (!session) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  try {
    const blocks = await refineBlocks(body.blocks, comment);
    session.blocks = blocks;
    await writeSession(name, session);
    await commitSessions(`Refine ${session.name}: ${firstLine(comment)}`);
    return NextResponse.json({ slug: name, session });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}

function firstLine(s: string): string {
  const line = s.split("\n")[0].trim();
  return line.length > 72 ? line.slice(0, 69) + "…" : line;
}
