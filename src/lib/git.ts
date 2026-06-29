import { execFile } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import { promisify } from "util";
import { SESSIONS_DIR } from "./sessions";

const run = promisify(execFile);

// A best-effort git history layer over the sessions directory. The markdown
// file on disk is always the source of truth; git is only a safety net so
// nothing is ever lost (deactivating a block deletes it from the doc, and these
// commits preserve the prior content). A git failure must never block a save.

async function git(dir: string, args: string[]): Promise<string> {
  const { stdout } = await run("git", ["-C", dir, ...args], {
    // Don't let a developer's global hooks/signing config interfere.
    env: {
      ...process.env,
      GIT_CONFIG_GLOBAL: "/dev/null",
      GIT_CONFIG_SYSTEM: "/dev/null",
    },
  });
  return stdout;
}

/** Initialise a git repo in `dir` on first use (idempotent). */
export async function ensureRepo(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
  try {
    await fs.access(path.join(dir, ".git"));
    return; // already a repo
  } catch {
    // not yet a repo — initialise
  }
  await git(dir, ["init", "--quiet"]);
  await git(dir, ["config", "user.name", "Design Decision Extractor"]);
  await git(dir, ["config", "user.email", "noreply@localhost"]);
  await git(dir, ["config", "commit.gpgsign", "false"]);
}

/**
 * Stage everything under `dir` and commit. Returns true if a commit was made,
 * false on a no-op (nothing changed) or any git error (e.g. git not installed)
 * — callers treat git as optional.
 */
export async function commit(dir: string, message: string): Promise<boolean> {
  try {
    await ensureRepo(dir);
    await git(dir, ["add", "-A"]);
    const status = await git(dir, ["status", "--porcelain"]);
    if (status.trim() === "") return false; // nothing to commit
    await git(dir, ["commit", "--quiet", "-m", message]);
    return true;
  } catch (err) {
    console.warn("[sessions/git] commit skipped:", (err as Error).message ?? err);
    return false;
  }
}

/** Commit the current state of the sessions directory. */
export function commitSessions(message: string): Promise<boolean> {
  return commit(SESSIONS_DIR, message);
}

/** Ensure the sessions directory is a git repo. */
export function ensureSessionsRepo(): Promise<void> {
  return ensureRepo(SESSIONS_DIR);
}
