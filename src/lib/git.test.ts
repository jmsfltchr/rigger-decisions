import { execFile } from "child_process";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { promisify } from "util";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { commit, ensureRepo } from "./git";

const run = promisify(execFile);

describe("git history layer", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), "dde-git-"));
  });
  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  it("commits create/update and preserves prior versions in history", async () => {
    await ensureRepo(dir);

    const file = path.join(dir, "checkout.md");
    await fs.writeFile(file, "v1: block kept\n");
    expect(await commit(dir, "Create checkout")).toBe(true);

    // a no-op commit (nothing changed) returns false
    expect(await commit(dir, "noop")).toBe(false);

    // simulate deleting a block from the doc, then commit again
    await fs.writeFile(file, "v2: block deleted\n");
    expect(await commit(dir, "Update checkout")).toBe(true);

    // two commits exist
    const { stdout: log } = await run("git", ["-C", dir, "log", "--oneline"]);
    expect(log.trim().split("\n")).toHaveLength(2);

    // the prior version (with the deleted block) is recoverable from history
    const { stdout: prior } = await run("git", [
      "-C",
      dir,
      "show",
      "HEAD~1:checkout.md",
    ]);
    expect(prior).toContain("block kept");
  });
});
