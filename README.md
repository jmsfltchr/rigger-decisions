# Design Decision Extractor

Turn a prose description of a software/system design into a **structured,
auditable set of decisions**. You write a session name and a passage of prose;
the tool sends the prose to the Claude API, which decomposes it into a list of
**blocks**. Each block is:

- a **design decision** or **background context** (kind),
- **tagged** by how it was derived — _directly stated_, _implied_, _deduced_,
  or _inferred_,
- **categorised** as a _fixed_ immutable fact or a _variable_, and
- written in **Attempto Controlled English (ACE)** so it is precise and
  machine-friendly.

When the prose is ambiguous, a block carries **multiple variations**, each with
its own prose, tag, and category. You review and edit everything in the UI
(prose, tag, category, kind; pick the active variation; activate/deactivate
blocks). Each session is stored as a markdown doc named after the session, which
is the round-trippable source of truth. Finally, the **active blocks are
concatenated into one long prose document for export** — intended to inform a
downstream LLM agent that will build the design.

## Stack

Next.js (App Router) + React + TypeScript, single full-stack app. The Claude API
key is used only in server-side code (`src/lib/anthropic.ts` and the API routes)
and is never shipped to the browser. Sessions are written to `./sessions/*.md`.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Configure your Claude API key:

   ```bash
   cp .env.local.example .env.local
   # then edit .env.local and set:
   # ANTHROPIC_API_KEY=sk-ant-...
   ```

   Get a key from the [Claude Console](https://console.anthropic.com/).

3. Run the dev server:

   ```bash
   npm run dev
   ```

   Open <http://localhost:3000>.

## Usage

1. On the home page, enter a **session name** and **design prose**, then click
   **Extract decisions**. The prose is sent to Claude (model `claude-opus-4-8`,
   structured output) and you are taken to the session editor.
2. In the editor, review the blocks. Edit prose, tag, category, and kind; switch
   the active variation where a block has several; deactivate blocks you don't
   want in the export. Changes auto-save to `sessions/<name>.md`.
3. **Re-extract from prose** re-runs extraction on the original prose (replacing
   the current blocks).
4. **Export** concatenates the active variation of every active block into one
   prose document you can copy or download.

## How it works

- `src/lib/anthropic.ts` — the Claude client, the ACE system prompt, the Zod
  schema for structured output, and `extractBlocks(prose)`. Uses
  `client.beta.messages.parse(...)` with `betaZodOutputFormat` for validated,
  typed output.
- `src/lib/markdown.ts` — `serialize(session)` / `parse(markdown)`. The
  canonical session data lives in YAML front-matter; the markdown body below it
  is a human-readable rendering regenerated on every save.
- `src/lib/sessions.ts` — filesystem helpers for `sessions/*.md`.
- `src/app/api/*` — `sessions` (list/create), `sessions/[name]` (load/save/
  delete), `extract` (re-run extraction), `export/[name]` (concatenated prose).

## Test

```bash
npm test
```

Runs a markdown round-trip test (`serialize` → `parse` deep-equals the original
session, including a block with multiple variations and a deactivated block).

## Out of scope (initial version)

Auth/multi-user, streaming the extraction, session version history, and
deployment beyond local `npm run dev`.
