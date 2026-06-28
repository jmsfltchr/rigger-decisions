"use client";

import {
  CATEGORIES,
  CATEGORY_LABELS,
  TAG_LABELS,
  TAGS,
  type Category,
  type Tag,
  type Variation,
} from "@/lib/types";

export default function VariationEditor({
  variation,
  onChange,
}: {
  variation: Variation;
  onChange: (variation: Variation) => void;
}) {
  return (
    <div className="block-content">
      <label>Prose (Attempto Controlled English)</label>
      <textarea
        value={variation.content}
        onChange={(e) => onChange({ ...variation, content: e.target.value })}
      />

      <div className="field-grid" style={{ marginTop: 12 }}>
        <div>
          <label>Tag (how it was derived)</label>
          <select
            value={variation.tag}
            onChange={(e) =>
              onChange({ ...variation, tag: e.target.value as Tag })
            }
          >
            {TAGS.map((t) => (
              <option key={t} value={t}>
                {TAG_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Category</label>
          <select
            value={variation.category}
            onChange={(e) =>
              onChange({ ...variation, category: e.target.value as Category })
            }
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
