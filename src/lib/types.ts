// Core domain types for the design decision extractor.

/** How a block was derived from the user's prose. */
export type Tag = "directly_stated" | "implied" | "deduced" | "inferred";

/** Whether the block is a fixed immutable fact or a variable. */
export type Category = "fixed" | "variable";

/** Whether the block is a design decision or background context. */
export type Kind = "decision" | "context";

export const TAGS: Tag[] = ["directly_stated", "implied", "deduced", "inferred"];
export const CATEGORIES: Category[] = ["fixed", "variable"];
export const KINDS: Kind[] = ["decision", "context"];

export const TAG_LABELS: Record<Tag, string> = {
  directly_stated: "Directly stated",
  implied: "Implied",
  deduced: "Deduced",
  inferred: "Inferred",
};

export const CATEGORY_LABELS: Record<Category, string> = {
  fixed: "Fixed (immutable fact)",
  variable: "Variable",
};

export const KIND_LABELS: Record<Kind, string> = {
  decision: "Design decision",
  context: "Background context",
};

/**
 * One interpretation of a block. tag and category live here (per-variation)
 * because the same underlying block can be read multiple ways when the prose
 * is ambiguous.
 */
export interface Variation {
  id: string;
  /** The block text, written in Attempto Controlled English. */
  content: string;
  tag: Tag;
  category: Category;
}

/**
 * A single block of the design. kind is block-level. A block with one variation
 * is the common (unambiguous) case; more than one variation means the prose was
 * ambiguous and Claude offered alternative readings. Removing a block deletes it
 * from the doc — git history (see lib/git.ts) is the recovery path.
 */
export interface Block {
  id: string;
  kind: Kind;
  /** Which variation is the live one used for export. */
  activeVariationId: string;
  variations: Variation[];
}

/** A named session: the original prose plus the extracted, edited blocks. */
export interface Session {
  name: string;
  prose: string;
  blocks: Block[];
}

/** Return the active variation of a block (falls back to the first). */
export function activeVariation(block: Block): Variation {
  return (
    block.variations.find((v) => v.id === block.activeVariationId) ??
    block.variations[0]
  );
}
