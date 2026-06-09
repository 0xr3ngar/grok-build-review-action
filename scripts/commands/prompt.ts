import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { optionalEnv, readJsonFile, requireEnv, workPath } from "../lib/env.ts";
import { PERSONALITIES, parseRoastLevel } from "../lib/personality.ts";
import { PrMetaSchema } from "../types.ts";

const TEMPLATE_PATH = path.join(import.meta.dir, "..", "prompt_template.md");

const truncate = (diff: string, maxBytes: number): string => {
  if (Buffer.byteLength(diff) <= maxBytes) return diff;
  const cut = Buffer.from(diff).subarray(0, maxBytes).toString("utf8");
  return `${cut}\n\n[NOTE: diff truncated — use read_file to inspect the remaining changed files listed in the PR metadata]`;
};

export const cmdPrompt = (): void => {
  const pr = readJsonFile(workPath("pr.json"), PrMetaSchema);
  const maxKb = Number(optionalEnv("MAX_DIFF_KB", "300"));
  const personality = PERSONALITIES[parseRoastLevel(process.env.ROAST_LEVEL)];

  const vars: Record<string, string | number> = {
    repo: requireEnv("GITHUB_REPOSITORY"),
    pr_number: pr.number,
    pr_title: pr.title,
    pr_body: pr.body.trim() || "(no description)",
    head_ref: pr.headRefName,
    base_ref: pr.baseRefName,
    head_sha: pr.headRefOid,
    additions: pr.additions,
    deletions: pr.deletions,
    changed_files: pr.changedFiles,
    personality: personality.promptInstructions,
    diff: truncate(readFileSync(workPath("pr.diff"), "utf8"), maxKb * 1024),
  };

  const prompt = readFileSync(TEMPLATE_PATH, "utf8").replace(
    /\$([a-z_]+)/g,
    (match, name: string) => (name in vars ? String(vars[name]) : match),
  );

  writeFileSync(workPath("prompt.md"), prompt);
  console.log(`Prompt written (${prompt.length} chars)`);
};
