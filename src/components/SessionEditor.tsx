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
  const [comment, setComment] = useState("");
  const [refining, setRefining] = useState(false);
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

  async function refine() {
    const text = comment.trim();
    if (!text) return;
    setRefining(true);
    setError(null);
    try {
      const res = await fetch(`/api/sessions/${slug}/refine`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: text, blocks: session.blocks }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Refine failed.");
      setSession(data.session as Session);
      setComment("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRefining(false);
    }
  }

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

  return (
    <>
      <div className="spread">
        <div>
          <h1>{session.name}</h1>
          <p className="muted">{session.blocks.length} blocks</p>
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

      <section className="panel" style={{ marginTop: 24 }}>
        <h2 style={{ marginTop: 0 }}>Refine with a comment</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Describe a clarification or correction. Claude revises the current
          blocks into an updated set in the same format, and the change is
          committed to the session&rsquo;s git history.
        </p>
        <textarea
          rows={4}
          value={comment}
          placeholder="e.g. The retry limit is fixed at three, not configurable. Add that the queue is FIFO."
          onChange={(e) => setComment(e.target.value)}
          disabled={refining}
        />
        <div className="row" style={{ marginTop: 12 }}>
          <button
            className="primary"
            onClick={refine}
            disabled={refining || !comment.trim()}
          >
            {refining ? "Refining…" : "Apply comment"}
          </button>
          {refining && (
            <span className="muted">
              Sending the current blocks and your comment to Claude…
            </span>
          )}
        </div>
      </section>

      <ExportPanel slug={slug} />
    </>
  );
}
