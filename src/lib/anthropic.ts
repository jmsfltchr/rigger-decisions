import Anthropic, { APIError } from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import type { Block, Variation } from "./types";

// --- Structured output schema --------------------------------------------------
// Enums + arrays are supported by structured outputs. We deliberately avoid
// numeric/string length constraints (min/max) in the wire schema.
const ExtractionSchema = z.object({
  blocks: z
    .array(
      z.object({
        kind: z.enum(["decision", "context"]),
        variations: z
          .array(
            z.object({
              content: z.string(),
              tag: z.enum([
                "directly_stated",
                "implied",
                "deduced",
                "inferred",
              ]),
              category: z.enum(["fixed", "variable"]),
            }),
          )
          .min(1),
      }),
    )
    .min(1),
});

const SYSTEM_PROMPT = `You decompose a prose description of a software/system design into a precise, auditable list of "blocks".

Each block is one atomic statement about the design and is exactly one of:
- a DESIGN DECISION ("decision"): a choice the design makes about how the system is built or behaves.
- BACKGROUND CONTEXT ("context"): a fact about the problem, domain, constraints, or environment that frames the design but is not itself a choice.

Tag every block by HOW you derived it from the prose:
- "directly_stated": the prose states it explicitly.
- "implied": the prose strongly suggests it without stating it outright.
- "deduced": it follows by logical necessity from what the prose states.
- "inferred": a reasonable but non-necessary reading of the prose.

Categorise every block as:
- "fixed": a fixed, immutable fact or constraint that must hold.
- "variable": something that could reasonably be changed, tuned, or chosen differently.

AMBIGUITY: If the prose is genuinely ambiguous about a block — it could be read in more than one defensible way — emit MULTIPLE variations for that block instead of guessing. Each variation has its own content, tag, and category. When the prose is clear, emit a single variation.

ATTEMPTO CONTROLLED ENGLISH: Write every block's "content" in Attempto Controlled English (ACE):
- One fact per sentence; short, simple, declarative sentences.
- Every common noun takes a determiner ("the", "a", "every", "no", a number).
- Use the singular and a determiner for general statements (e.g. "Every request carries a token.").
- Use active voice and present tense.
- Do NOT use pronouns (it, they, this, that) — repeat the noun instead.
- Avoid vague words ("etc.", "and so on", "some"), conjunctions that join clauses, and relative ambiguity.
- Name concrete subjects and objects explicitly.

Decompose thoroughly: prefer several small, single-fact blocks over one compound block. Preserve the order in which topics appear in the prose. Do not invent requirements that have no basis in the prose.`;

/**
 * Normalize a raw env value into a usable API key: trim surrounding whitespace
 * and strip a single pair of wrapping quotes. Returns "" for missing or the
 * placeholder value so callers can treat "not configured" uniformly.
 */
export function normalizeApiKey(raw: string | undefined): string {
  if (!raw) return "";
  let key = raw.trim();
  if (
    key.length >= 2 &&
    ((key.startsWith('"') && key.endsWith('"')) ||
      (key.startsWith("'") && key.endsWith("'")))
  ) {
    key = key.slice(1, -1).trim();
  }
  if (key === "" || key === "sk-ant-...") return "";
  return key;
}

/** Masked view of the Anthropic config the server actually loaded. No secret. */
export function anthropicDiagnostics() {
  const raw = process.env.ANTHROPIC_API_KEY;
  const key = normalizeApiKey(raw);
  const baseUrlRaw = process.env.ANTHROPIC_BASE_URL?.trim();
  let baseUrlHost = "api.anthropic.com";
  if (baseUrlRaw) {
    try {
      baseUrlHost = new URL(baseUrlRaw).host;
    } catch {
      baseUrlHost = "(invalid URL)";
    }
  }
  return {
    apiKey: {
      present: key.length > 0,
      length: key.length,
      prefix: key.slice(0, 7),
      looksValid: key.startsWith("sk-ant-"),
      hadWhitespace: raw !== undefined && raw !== raw.trim(),
      hadQuotes: raw !== undefined && /^\s*["']|["']\s*$/.test(raw),
    },
    baseUrl: { set: Boolean(baseUrlRaw), host: baseUrlHost },
    authTokenSet: Boolean(process.env.ANTHROPIC_AUTH_TOKEN),
  };
}

let cachedClient: Anthropic | null = null;
function client(): Anthropic {
  const apiKey = normalizeApiKey(process.env.ANTHROPIC_API_KEY);
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Copy .env.local.example to .env.local, add your sk-ant- key, and restart the dev server.",
    );
  }
  // Construct with the normalized key explicitly so a quoted/whitespaced env
  // value can't be sent verbatim. baseURL is left to the SDK default; see
  // GET /api/health to confirm what the server loaded.
  if (!cachedClient) cachedClient = new Anthropic({ apiKey });
  return cachedClient;
}

function id(): string {
  return globalThis.crypto.randomUUID();
}

/** Turn an Anthropic SDK error into an actionable message for the UI. */
function translateApiError(err: unknown): Error {
  const status = err instanceof APIError ? err.status : undefined;
  if (status === 401 || status === 403) {
    return new Error(
      "Authentication failed (" +
        status +
        "): Anthropic rejected the API key. Open /api/health to see what the server loaded. " +
        "Ensure ANTHROPIC_API_KEY in .env.local is a valid sk-ant- key with no quotes or spaces, " +
        "that no ANTHROPIC_API_KEY / ANTHROPIC_BASE_URL / ANTHROPIC_AUTH_TOKEN is exported in your shell " +
        "(those override .env.local), and restart the dev server.",
    );
  }
  if (status === 429) {
    return new Error(
      "Rate limited (429) by Anthropic. Wait a moment and try again.",
    );
  }
  return err instanceof Error ? err : new Error(String(err));
}

/**
 * Send the prose to Claude and return fully-formed Blocks (ids assigned, all
 * active by default, first variation active).
 */
export async function extractBlocks(prose: string): Promise<Block[]> {
  let response;
  try {
    response = await client().beta.messages.parse({
      model: "claude-opus-4-8",
      max_tokens: 16000,
      system: SYSTEM_PROMPT,
      output_format: betaZodOutputFormat(ExtractionSchema),
      messages: [
        {
          role: "user",
          content: `Decompose the following design description into blocks.\n\n---\n${prose}\n---`,
        },
      ],
    });
  } catch (err) {
    throw translateApiError(err);
  }

  const parsed = response.parsed_output;
  if (!parsed) {
    throw new Error(
      `Claude did not return structured output (stop_reason: ${response.stop_reason}).`,
    );
  }

  return parsed.blocks.map((b): Block => {
    const variations: Variation[] = b.variations.map((v) => ({
      id: id(),
      content: v.content,
      tag: v.tag,
      category: v.category,
    }));
    return {
      id: id(),
      kind: b.kind,
      active: true,
      activeVariationId: variations[0].id,
      variations,
    };
  });
}
