import { promises as fs } from "fs";
import path from "path";
import { parse, serialize } from "./markdown";
import type { Session } from "./types";

export const SESSIONS_DIR = path.join(process.cwd(), "sessions");

/** Turn a human session name into a safe filename slug (used as the URL id). */
export function slug(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "untitled"
  );
}

async function ensureDir(): Promise<void> {
  await fs.mkdir(SESSIONS_DIR, { recursive: true });
}

function fileFor(s: string): string {
  return path.join(SESSIONS_DIR, `${s}.md`);
}

export interface SessionSummary {
  slug: string;
  name: string;
  blockCount: number;
}

/** List all saved sessions (slug + display name). */
export async function listSessions(): Promise<SessionSummary[]> {
  await ensureDir();
  const entries = await fs.readdir(SESSIONS_DIR);
  const summaries: SessionSummary[] = [];
  for (const entry of entries) {
    if (!entry.endsWith(".md")) continue;
    try {
      const raw = await fs.readFile(path.join(SESSIONS_DIR, entry), "utf8");
      const session = parse(raw);
      summaries.push({
        slug: entry.replace(/\.md$/, ""),
        name: session.name,
        blockCount: session.blocks.length,
      });
    } catch {
      // skip files that don't parse as sessions
    }
  }
  return summaries.sort((a, b) => a.name.localeCompare(b.name));
}

/** Load one session by slug. Returns null if it does not exist. */
export async function readSession(s: string): Promise<Session | null> {
  try {
    const raw = await fs.readFile(fileFor(s), "utf8");
    return parse(raw);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
}

/** Write a session to disk under its slug. */
export async function writeSession(s: string, session: Session): Promise<void> {
  await ensureDir();
  await fs.writeFile(fileFor(s), serialize(session), "utf8");
}

/** True if a session file already exists for this slug. */
export async function sessionExists(s: string): Promise<boolean> {
  try {
    await fs.access(fileFor(s));
    return true;
  } catch {
    return false;
  }
}

/** Delete a session file. */
export async function deleteSession(s: string): Promise<void> {
  try {
    await fs.unlink(fileFor(s));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
  }
}
