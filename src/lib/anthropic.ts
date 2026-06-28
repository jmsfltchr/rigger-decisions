import Anthropic from "@anthropic-ai/sdk";
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

let cachedClient: Anthropic | null = null;
function client(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Copy .env.local.example to .env.local and add your key.",
    );
  }
  if (!cachedClient) cachedClient = new Anthropic();
  return cachedClient;
}

function id(): string {
  return globalThis.crypto.randomUUID();
}

/**
 * Send the prose to Claude and return fully-formed Blocks (ids assigned, all
 * active by default, first variation active).
 */
export async function extractBlocks(prose: string): Promise<Block[]> {
  const response = await client().beta.messages.parse({
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
