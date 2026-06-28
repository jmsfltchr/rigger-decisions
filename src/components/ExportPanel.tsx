"use client";

import { useState } from "react";

export default function ExportPanel({ slug }: { slug: string }) {
  const [text, setText] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function generate() {
    setBusy(true);
    setCopied(false);
    try {
      const res = await fetch(`/api/export/${slug}`);
      setText(await res.text());
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (text == null) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
  }

  return (
    <section className="panel" style={{ marginTop: 28 }}>
      <div className="spread">
        <h2 style={{ margin: 0 }}>Export</h2>
        <div className="row">
          <button className="subtle" onClick={generate} disabled={busy}>
            {busy ? "Generating…" : text == null ? "Generate" : "Refresh"}
          </button>
          {text != null && (
            <>
              <button className="subtle" onClick={copy}>
                {copied ? "Copied ✓" : "Copy"}
              </button>
              <a href={`/api/export/${slug}`} download>
                <button className="subtle">Download</button>
              </a>
            </>
          )}
        </div>
      </div>
      <p className="muted" style={{ marginTop: 4 }}>
        The active variation of every active block, concatenated into one prose
        document for a downstream build agent. Reflects saved changes.
      </p>
      {text != null && (
        <textarea className="export-box" readOnly value={text} />
      )}
    </section>
  );
}
