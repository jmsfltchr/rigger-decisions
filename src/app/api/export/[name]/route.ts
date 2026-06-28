import { NextRequest, NextResponse } from "next/server";
import { readSession, slug } from "@/lib/sessions";
import { activeVariation } from "@/lib/types";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ name: string }> };

/**
 * GET /api/export/[name] — concatenate the active variation of every active
 * block into one long prose document, in block order. This is the artifact
 * handed to a downstream LLM agent that will build the design.
 */
export async function GET(_req: NextRequest, { params }: Ctx) {
  const { name } = await params;
  const session = await readSession(name);
  if (!session) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const prose = session.blocks
    .filter((b) => b.active)
    .map((b) => activeVariation(b).content.trim())
    .filter(Boolean)
    .join("\n\n");

  return new NextResponse(prose, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug(session.name)}-design.txt"`,
    },
  });
}
