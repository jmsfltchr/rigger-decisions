import { NextRequest, NextResponse } from "next/server";
import { extractBlocks } from "@/lib/anthropic";
import { commitSessions } from "@/lib/git";
import {
  listSessions,
  sessionExists,
  slug,
  writeSession,
} from "@/lib/sessions";
import type { Session } from "@/lib/types";

export const runtime = "nodejs";

/** GET /api/sessions — list all saved sessions. */
export async function GET() {
  try {
    const sessions = await listSessions();
    return NextResponse.json({ sessions });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}

/** POST /api/sessions — create a session: { name, prose } -> extract -> save. */
export async function POST(req: NextRequest) {
  let body: { name?: string; prose?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const name = (body.name ?? "").trim();
  const prose = (body.prose ?? "").trim();
  if (!name) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }
  if (!prose) {
    return NextResponse.json({ error: "Prose is required." }, { status: 400 });
  }

  const s = slug(name);
  if (await sessionExists(s)) {
    return NextResponse.json(
      { error: `A session named "${name}" already exists.` },
      { status: 409 },
    );
  }

  try {
    const blocks = await extractBlocks(prose);
    const session: Session = { name, prose, blocks };
    await writeSession(s, session);
    await commitSessions(`Create ${name}`);
    return NextResponse.json({ slug: s, session }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
