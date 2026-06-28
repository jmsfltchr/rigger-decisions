"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Block, Session } from "@/lib/types";
import BlockCard from "./BlockCard";
import ExportPanel from "./ExportPanel";

type SaveState = "idle" | "saving" | "saved" | "error";

export default function SessionEditor({
  slug,
  initialSession,
}: {
  slug: string;
  initialSession: Session;
}) {
  const [session, setSession] = useState<Session>(initialSession);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [reExtracting, setReExtracting] = useState(false);
  const firstRender = useRef(true);

  // Debounced auto-save whenever the session changes.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setSaveState("saving");
    const handle = setTimeout(async () => {
      try {
        const res = await fetch(`/api/sessions/${slug}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(session),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Save failed.");
        }
        setSaveState("saved");
      } catch (err) {
        setSaveState("error");
        setError((err as Error).message);
      }
    }, 600);
    return () => clearTimeout(handle);
  }, [session, slug]);

  const updateBlock = useCallback((updated: Block) => {
    setSession((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) => (b.id === updated.id ? updated : b)),
    }));
  }, []);

  const removeBlock = useCallback((id: string) => {
    setSession((prev) => ({
      ...prev,
      blocks: prev.blocks.filter((b) => b.id !== id),
    }));
  }, []);

  async function reExtract() {
    if (
      !confirm(
        "Re-run extraction on the original prose? This replaces all current blocks and discards your edits.",
      )
    )
      return;
    setReExtracting(true);
    setError(null);
    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prose: session.prose }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Re-extraction failed.");
      setSession((prev) => ({ ...prev, blocks: data.blocks as Block[] }));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setReExtracting(false);
    }
  }

  const activeCount = session.blocks.filter((b) => b.active).length;

  return (
    <>
      <div className="spread">
        <div>
          <h1>{session.name}</h1>
          <p className="muted">
            {session.blocks.length} blocks · {activeCount} active
          </p>
        </div>
        <span className="save-status">
          {saveState === "saving" && "Saving…"}
          {saveState === "saved" && "All changes saved"}
          {saveState === "error" && "Save failed"}
        </span>
      </div>

      {error && <div className="error">{error}</div>}

      <details className="panel">
        <summary style={{ cursor: "pointer", fontWeight: 600 }}>
          Source prose
        </summary>
        <p style={{ whiteSpace: "pre-wrap", marginBottom: 0 }}>
          {session.prose}
        </p>
      </details>

      <div className="row" style={{ marginBottom: 16 }}>
        <button onClick={reExtract} disabled={reExtracting} className="subtle">
          {reExtracting ? "Re-extracting…" : "Re-extract from prose"}
        </button>
      </div>

      <h2>Blocks</h2>
      {session.blocks.map((block) => (
        <BlockCard
          key={block.id}
          block={block}
          onChange={updateBlock}
          onRemove={removeBlock}
        />
      ))}

      <ExportPanel slug={slug} />
    </>
  );
}
