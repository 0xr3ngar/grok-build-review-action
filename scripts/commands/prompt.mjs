import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { env, readJson, workPath } from "../lib/env.mjs";

const TEMPLATE_PATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "prompt_template.md",
);

export const cmdPrompt = () => {
  const repo = env("GITHUB_REPOSITORY");
  const maxKb = parseInt(process.env.MAX_DIFF_KB || "300", 10);
  const pr = readJson(workPath("pr.json"));
  let diff = fs.readFileSync(workPath("pr.diff"), "utf8");

  const maxBytes = maxKb * 1024;
  if (Buffer.byteLength(diff) > maxBytes) {
    diff =
      Buffer.from(diff).subarray(0, maxBytes).toString("utf8") +
      `\n\n[NOTE: diff truncated at ${maxKb}KB — use read_file to inspect the remaining changed files listed in the PR metadata]`;
  }

  const template = fs.readFileSync(TEMPLATE_PATH, "utf8");

  const vars = {
    repo,
    pr_number: pr.number,
    pr_title: pr.title || "",
    pr_body: (pr.body || "").trim() || "(no description)",
    head_ref: pr.headRefName || "",
    base_ref: pr.baseRefName || "",
    head_sha: pr.headRefOid || "",
    additions: pr.additions ?? 0,
    deletions: pr.deletions ?? 0,
    changed_files: pr.changedFiles ?? 0,
    diff,
  };
  
  const prompt = template.replace(/\$([a-z_]+)/g, (match, name) =>
    name in vars ? String(vars[name]) : match,
  );

  fs.writeFileSync(workPath("prompt.md"), prompt);
  console.log(`Prompt written (${prompt.length} chars)`);
}
