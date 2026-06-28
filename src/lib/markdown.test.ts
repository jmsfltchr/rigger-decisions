import { describe, expect, it } from "vitest";
import { parse, serialize } from "./markdown";
import type { Session } from "./types";

const sample: Session = {
  name: "Checkout service redesign",
  prose:
    "The checkout service must charge a card. It should probably retry failed charges.",
  blocks: [
    {
      id: "blk-1",
      kind: "decision",
      active: true,
      activeVariationId: "var-1a",
      variations: [
        {
          id: "var-1a",
          content: "The checkout service charges a card.",
          tag: "directly_stated",
          category: "fixed",
        },
      ],
    },
    {
      // ambiguous block with two variations; the second one is active
      id: "blk-2",
      kind: "decision",
      active: false,
      activeVariationId: "var-2b",
      variations: [
        {
          id: "var-2a",
          content: "The checkout service retries a failed charge once.",
          tag: "inferred",
          category: "variable",
        },
        {
          id: "var-2b",
          content: "The checkout service retries a failed charge three times.",
          tag: "inferred",
          category: "variable",
        },
      ],
    },
  ],
};

describe("markdown round-trip", () => {
  it("serialize -> parse reproduces the session exactly", () => {
    const round = parse(serialize(sample));
    expect(round).toEqual(sample);
  });

  it("preserves multiple variations and the chosen active variation", () => {
    const round = parse(serialize(sample));
    const block = round.blocks[1];
    expect(block.variations).toHaveLength(2);
    expect(block.activeVariationId).toBe("var-2b");
    expect(block.active).toBe(false);
  });

  it("falls back the active variation if the stored id is missing", () => {
    const broken = serialize({
      ...sample,
      blocks: [{ ...sample.blocks[0], activeVariationId: "does-not-exist" }],
    });
    const round = parse(broken);
    expect(round.blocks[0].activeVariationId).toBe("var-1a");
  });
});
