"use client";

import {
  activeVariation,
  KIND_LABELS,
  KINDS,
  TAG_LABELS,
  CATEGORY_LABELS,
  type Block,
  type Kind,
  type Variation,
} from "@/lib/types";
import VariationEditor from "./VariationEditor";

export default function BlockCard({
  block,
  onChange,
  onRemove,
}: {
  block: Block;
  onChange: (block: Block) => void;
  onRemove: (id: string) => void;
}) {
  const current = activeVariation(block);

  function setKind(kind: Kind) {
    onChange({ ...block, kind });
  }

  function selectVariation(id: string) {
    onChange({ ...block, activeVariationId: id });
  }

  function updateVariation(updated: Variation) {
    onChange({
      ...block,
      variations: block.variations.map((v) =>
        v.id === updated.id ? updated : v,
      ),
    });
  }

  return (
    <div className="block">
      <div className="spread">
        <div className="row">
          <span className={`badge ${block.kind}`}>{KIND_LABELS[block.kind]}</span>
          <span className="badge tag">{TAG_LABELS[current.tag]}</span>
          <span className="badge category">
            {CATEGORY_LABELS[current.category]}
          </span>
        </div>
        <div className="row">
          <button
            className="danger subtle"
            onClick={() => {
              if (
                confirm(
                  "Delete this block? It is removed from the document but kept in git history.",
                )
              )
                onRemove(block.id);
            }}
            title="Removes the block from the document. Recoverable from git history."
          >
            Delete
          </button>
        </div>
      </div>

      {block.variations.length > 1 && (
        <div className="variation-tabs">
          {block.variations.map((v, i) => (
            <button
              key={v.id}
              className={v.id === block.activeVariationId ? "active" : ""}
              onClick={() => selectVariation(v.id)}
            >
              Variation {i + 1}
              {v.id === block.activeVariationId ? " ✓" : ""}
            </button>
          ))}
        </div>
      )}

      <div className="field-grid" style={{ marginTop: 12 }}>
        <div>
          <label>Kind</label>
          <select
            value={block.kind}
            onChange={(e) => setKind(e.target.value as Kind)}
          >
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {KIND_LABELS[k]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <VariationEditor variation={current} onChange={updateVariation} />
    </div>
  );
}
