"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewSessionForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [prose, setProse] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, prose }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create session.");
      router.push(`/session/${data.slug}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <form className="panel" onSubmit={submit}>
      <label htmlFor="name">Session name</label>
      <input
        id="name"
        type="text"
        value={name}
        placeholder="e.g. Checkout service redesign"
        onChange={(e) => setName(e.target.value)}
        disabled={busy}
      />

      <div style={{ height: 12 }} />

      <label htmlFor="prose">Design prose</label>
      <textarea
        id="prose"
        rows={8}
        value={prose}
        placeholder="Describe the design in plain prose. Claude will extract the decisions and context."
        onChange={(e) => setProse(e.target.value)}
        disabled={busy}
      />

      {error && <div className="error">{error}</div>}

      <div className="row" style={{ marginTop: 12 }}>
        <button
          type="submit"
          className="primary"
          disabled={busy || !name.trim() || !prose.trim()}
        >
          {busy ? "Extracting…" : "Extract decisions"}
        </button>
        {busy && (
          <span className="muted">Sending prose to Claude — this can take a moment.</span>
        )}
      </div>
    </form>
  );
}
