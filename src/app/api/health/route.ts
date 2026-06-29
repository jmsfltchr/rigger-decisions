import { NextResponse } from "next/server";
import { anthropicDiagnostics } from "@/lib/anthropic";

export const runtime = "nodejs";

/**
 * GET /api/health — masked report of the Anthropic config the server actually
 * loaded. No secret is returned: only the key prefix/length, whether it looks
 * valid, whether it had quotes/whitespace, the effective base URL host, and
 * whether an auth token is set. Use this to diagnose `invalid x-api-key`.
 */
export async function GET() {
  return NextResponse.json(anthropicDiagnostics());
}
