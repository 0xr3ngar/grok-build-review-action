import fs from "node:fs";
import process from "node:process";

import { env, readJson, setOutput, workPath } from "../lib/env.mjs";
import { ghApi } from "../lib/github.mjs";
import { upsertStatusComment } from "../lib/comment.mjs";
import { lineKey, rightSideLines } from "../lib/diff.mjs";
import { extractReview, issueMd, normalizeIssues } from "../lib/review.mjs";
import { CLEAN_LINES, SEVERITY_EMOJI, pick } from "../lib/messages.mjs";

const finishError = async (repo, prNumber, runUrl, reason, rawText = "") => {
  let body =
    `## :x: Grok Build Review — failed\n\n` +
    `${reason}\n\n` +
    `<sub>[workflow run](${runUrl})</sub>`;
  if (rawText) {
    const snippet = rawText.trim().slice(0, 3000);
    body += `\n\n<details><summary>Raw output</summary>\n\n\`\`\`\n${snippet}\n\`\`\`\n\n</details>`;
  }
  await upsertStatusComment(repo, prNumber, body);
  setOutput("verdict", "error");
  setOutput("issue_count", "0");
  setOutput("bug_count", "0");
  setOutput("review_url", "");
  console.log(`::error::${reason}`);
  process.exit(1);
}

const readGrokOutput = async (repo, prNumber, runUrl) => {
  let exitCode = "1";
  const exitFile = workPath("grok-exit");
  if (fs.existsSync(exitFile)) exitCode = fs.readFileSync(exitFile, "utf8").trim();

  let rawText = "";
  const outFile = workPath("grok-output.json");
  if (fs.existsSync(outFile)) {
    const raw = fs.readFileSync(outFile, "utf8").trim();
    try {
      const data = JSON.parse(raw);
      if (data.type === "error") {
        await finishError(repo, prNumber, runUrl,
          `Grok CLI returned an error: ${data.message ?? "unknown"}`, raw);
      }
      rawText = data.text ?? "";
    } catch {
      rawText = raw;
    }
  }

  if (exitCode !== "0" && !rawText) {
    await finishError(repo, prNumber, runUrl,
      `Grok CLI exited with code ${exitCode} and produced no output. ` +
      `Most likely the auth session expired — refresh the \`GROK_AUTH_JSON\` secret ` +
      `(\`grok login\` on your machine, then copy \`~/.grok/auth.json\`).`);
  }
  return rawText;
}

export const cmdFinish = async () => {
  const repo = env("GITHUB_REPOSITORY");
  const prNumber = env("PR_NUMBER");
  const runUrl = env("RUN_URL", "");
  const failOn = process.env.FAIL_ON || "never";

  const pr = readJson(workPath("pr.json"));
  const headSha = pr.headRefOid;
  const headShort = headSha.slice(0, 7);

  const rawText = await readGrokOutput(repo, prNumber, runUrl);

  const review = extractReview(rawText);
  if (review === null) {
    await finishError(repo, prNumber, runUrl,
      "Grok finished but did not produce a parseable review block.", rawText);
  }

  const summary = String(review.summary ?? "").trim();
  const issues = normalizeIssues(review.issues);
  const bugs = issues.filter((i) => i.severity === "bug");
  const warnings = issues.filter((i) => i.severity === "warning");
  const nits = issues.filter((i) => i.severity === "nit");

  // --- no issues: just flex -------------------------------------------------
  if (issues.length === 0) {
    const body =
      `## :white_check_mark: Grok Build Review — no issues\n\n` +
      `${pick(CLEAN_LINES)}\n\n` +
      `> ${summary}\n\n` +
      `\`0 issues\` on commit \`${headShort}\`.\n\n` +
      `<sub>[workflow run](${runUrl})</sub>`;
    await upsertStatusComment(repo, prNumber, body);
    setOutput("verdict", "clean");
    setOutput("issue_count", "0");
    setOutput("bug_count", "0");
    setOutput("review_url", "");
    console.log("No issues found.");
    return;
  }

  // --- issues: post a review with inline comments ---------------------------
  const diffPairs = rightSideLines(fs.readFileSync(workPath("pr.diff"), "utf8"));

  const inline = [];
  const promoted = [];
  for (const it of issues) {
    if (it.line !== null && diffPairs.has(lineKey(it.file, it.line))) inline.push(it);
    else promoted.push(it);
  }

  const countsLine =
    `${SEVERITY_EMOJI.bug} **${bugs.length}** bugs · ` +
    `${SEVERITY_EMOJI.warning} **${warnings.length}** warnings · ` +
    `${SEVERITY_EMOJI.nit} **${nits.length}** nits`;

  let reviewBody = `## Grok Build Review\n\n${summary}\n\n${countsLine}`;
  if (promoted.length > 0) {
    reviewBody +=
      `\n\n### Findings outside the diff\n\n` +
      `These reference lines not present in the diff, so they couldn't be inline comments:\n\n` +
      promoted.map((it) => issueMd(it, true)).join("\n\n---\n\n");
  }
  reviewBody += `\n\n<sub>Reviewed commit \`${headShort}\` · [workflow run](${runUrl})</sub>`;

  const payload = {
    commit_id: headSha,
    event: "COMMENT",
    body: reviewBody,
    comments: inline.map((it) => ({
      path: it.file,
      line: it.line,
      side: "RIGHT",
      body: issueMd(it),
    })),
  };

  let [status, resp] = await ghApi("POST", `/repos/${repo}/pulls/${prNumber}/reviews`, payload);

  if (status === 422 && inline.length > 0) {
    // Some inline line targets were rejected; fall back to body-only.
    console.log(`::warning::Inline comments rejected (422), falling back to body-only review: ${resp._error ?? ""}`);
    const fallbackBody =
      `## Grok Build Review\n\n${summary}\n\n${countsLine}\n\n### Findings\n\n` +
      issues.map((it) => issueMd(it, true)).join("\n\n---\n\n") +
      `\n\n<sub>Reviewed commit \`${headShort}\` · [workflow run](${runUrl})</sub>`;
    [status, resp] = await ghApi("POST", `/repos/${repo}/pulls/${prNumber}/reviews`, {
      commit_id: headSha,
      event: "COMMENT",
      body: fallbackBody,
    });
  }

  if (status !== 200 && status !== 201) {
    await finishError(repo, prNumber, runUrl,
      `Failed to post review (HTTP ${status}): ${resp._error ?? ""}`);
  }

  const reviewUrl = resp.html_url ?? "";
  const s = (n) => (n !== 1 ? "s" : "");

  const statusBody =
    `## :mag: Grok Build Review — ${issues.length} issue${s(issues.length)} found\n\n` +
    `Grok cooked, and it has notes. :memo:\n\n` +
    `> ${summary}\n\n` +
    `${countsLine}\n\n` +
    `See the [review](${reviewUrl}) — ${inline.length} inline comment${s(inline.length)}` +
    (promoted.length > 0 ? `, ${promoted.length} in the review body` : "") +
    `. Commit \`${headShort}\`.\n\n` +
    `<sub>[workflow run](${runUrl})</sub>`;
  await upsertStatusComment(repo, prNumber, statusBody);

  setOutput("verdict", "issues");
  setOutput("issue_count", String(issues.length));
  setOutput("bug_count", String(bugs.length));
  setOutput("review_url", reviewUrl);
  console.log(`Posted review with ${inline.length} inline comments, ${promoted.length} promoted: ${reviewUrl}`);

  if (failOn === "any" || (failOn === "bugs" && bugs.length > 0)) {
    console.log(`::error::fail_on=${failOn}: ${bugs.length} bugs / ${issues.length} issues found.`);
    process.exit(1);
  }
}
