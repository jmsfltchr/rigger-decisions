import { NextRequest, NextResponse } from "next/server";
import {
  deleteSession,
  readSession,
  sessionExists,
  writeSession,
} from "@/lib/sessions";
import type { Block, Session } from "@/lib/types";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ name: string }> };

/** GET /api/sessions/[name] — load one session by slug. */
export async function GET(_req: NextRequest, { params }: Ctx) {
  const { name } = await params;
  const session = await readSession(name);
  if (!session) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  return NextResponse.json({ slug: name, session });
}

/** PUT /api/sessions/[name] — save edits to a session. */
export async function PUT(req: NextRequest, { params }: Ctx) {
  const { name } = await params;
  if (!(await sessionExists(name))) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  let body: Partial<Session>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (typeof body.name !== "string" || !Array.isArray(body.blocks)) {
    return NextResponse.json(
      { error: "Body must include name and blocks." },
      { status: 400 },
    );
  }

  const session: Session = {
    name: body.name,
    prose: typeof body.prose === "string" ? body.prose : "",
    blocks: body.blocks as Block[],
  };

  try {
    await writeSession(name, session);
    return NextResponse.json({ slug: name, session });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}

/** DELETE /api/sessions/[name] — remove a session. */
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { name } = await params;
  await deleteSession(name);
  return NextResponse.json({ ok: true });
}
