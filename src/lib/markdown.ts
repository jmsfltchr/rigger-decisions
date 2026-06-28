import matter from "gray-matter";
import {
  activeVariation,
  CATEGORY_LABELS,
  KIND_LABELS,
  TAG_LABELS,
  type Block,
  type Category,
  type Kind,
  type Session,
  type Tag,
  type Variation,
} from "./types";

// The canonical, round-trippable representation of a session lives in the YAML
// front-matter. The markdown body below it is a human-readable rendering,
// regenerated on every save and ignored on load.

interface FrontMatter {
  name: string;
  prose: string;
  blocks: Block[];
}

function renderBody(session: Session): string {
  const lines: string[] = [`# ${session.name}`, ""];

  if (session.prose.trim()) {
    lines.push("## Source prose", "", session.prose.trim(), "");
  }

  lines.push("## Blocks", "");
  session.blocks.forEach((block, i) => {
    const status = block.active ? "active" : "inactive";
    lines.push(`### ${i + 1}. ${KIND_LABELS[block.kind]} (${status})`, "");
    block.variations.forEach((v) => {
      const marker = v.id === block.activeVariationId ? "→ " : "  ";
      lines.push(
        `${marker}- **${TAG_LABELS[v.tag]}** · _${CATEGORY_LABELS[v.category]}_`,
        `    ${v.content}`,
      );
    });
    lines.push("");
  });

  return lines.join("\n");
}

/** Serialize a session to a markdown document (front-matter + readable body). */
export function serialize(session: Session): string {
  const data: FrontMatter = {
    name: session.name,
    prose: session.prose,
    blocks: session.blocks,
  };
  return matter.stringify(renderBody(session), data);
}

// --- Parsing (light validation/coercion back into typed Session) --------------

const TAG_SET = new Set<Tag>([
  "directly_stated",
  "implied",
  "deduced",
  "inferred",
]);
const CATEGORY_SET = new Set<Category>(["fixed", "variable"]);
const KIND_SET = new Set<Kind>(["decision", "context"]);

function coerceVariation(raw: unknown): Variation | null {
  if (!raw || typeof raw !== "object") return null;
  const v = raw as Record<string, unknown>;
  if (typeof v.id !== "string" || typeof v.content !== "string") return null;
  if (!TAG_SET.has(v.tag as Tag)) return null;
  if (!CATEGORY_SET.has(v.category as Category)) return null;
  return {
    id: v.id,
    content: v.content,
    tag: v.tag as Tag,
    category: v.category as Category,
  };
}

function coerceBlock(raw: unknown): Block | null {
  if (!raw || typeof raw !== "object") return null;
  const b = raw as Record<string, unknown>;
  if (typeof b.id !== "string") return null;
  if (!KIND_SET.has(b.kind as Kind)) return null;
  const variations = Array.isArray(b.variations)
    ? b.variations.map(coerceVariation).filter((v): v is Variation => v !== null)
    : [];
  if (variations.length === 0) return null;
  const activeVariationId =
    typeof b.activeVariationId === "string" &&
    variations.some((v) => v.id === b.activeVariationId)
      ? b.activeVariationId
      : variations[0].id;
  return {
    id: b.id,
    kind: b.kind as Kind,
    active: b.active !== false, // default to active
    activeVariationId,
    variations,
  };
}

/** Parse a markdown document back into a Session. Throws if it is not valid. */
export function parse(markdown: string): Session {
  const { data } = matter(markdown);
  const d = data as Record<string, unknown>;
  if (typeof d.name !== "string") {
    throw new Error("Invalid session document: missing name in front-matter.");
  }
  const blocks = Array.isArray(d.blocks)
    ? d.blocks.map(coerceBlock).filter((b): b is Block => b !== null)
    : [];
  return {
    name: d.name,
    prose: typeof d.prose === "string" ? d.prose : "",
    blocks,
  };
}

// Re-export for callers that render the active line elsewhere.
export { activeVariation };
