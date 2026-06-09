import { existsSync, readFileSync } from "node:fs";

import { fail, optionalEnv, readJsonFile, requireEnv, setOutput, workPath } from "../lib/env.ts";
import { ghApi } from "../lib/github.ts";
import { upsertStatusComment } from "../lib/comment.ts";
import { lineKey, rightSideLines } from "../lib/diff.ts";
import { extractReview, renderIssue } from "../lib/review.ts";
import { PERSONALITIES, SEVERITY_EMOJI, parseRoastLevel, pick } from "../lib/personality.ts";
import { GrokCliOutputSchema, PrMetaSchema } from "../types.ts";
import type { Issue, Personality, Severity, Verdict } from "../types.ts";

interface Ctx {
  repo: string;
  prNumber: string;
  runUrl: string;
  headSha: string;
  personality: Personality;
}

interface PostedReview {
  html_url?: string;
}

const plural = (count: number, word: string): string =>
  `${count} ${word}${count === 1 ? "" : "s"}`;

const footer = (ctx: Ctx): string =>
  `<sub>Reviewed commit \`${ctx.headSha.slice(0, 7)}\` · [workflow run](${ctx.runUrl})</sub>`;

const emitOutputs = (verdict: Verdict, issues: Issue[] = [], reviewUrl = ""): void => {
  setOutput("verdict", verdict);
  setOutput("issue_count", issues.length);
  setOutput("bug_count", issues.filter((issue) => issue.severity === "bug").length);
  setOutput("review_url", reviewUrl);
};

const abort = async (ctx: Ctx, reason: string, rawText = ""): Promise<never> => {
  const details = rawText
    ? `\n\n<details><summary>Raw output</summary>\n\n\`\`\`\n${rawText.trim().slice(0, 3000)}\n\`\`\`\n\n</details>`
    : "";
  await upsertStatusComment(
    ctx.repo,
    ctx.prNumber,
    `## :x: Grok Build Review — failed\n\n${reason}${details}\n\n${footer(ctx)}`,
  );
  emitOutputs("error");
  return fail(reason);
};

const readGrokText = async (ctx: Ctx): Promise<string> => {
  const exitFile = workPath("grok-exit");
  const exitCode = existsSync(exitFile) ? readFileSync(exitFile, "utf8").trim() : "1";

  let text = "";
  const outputFile = workPath("grok-output.json");
  if (existsSync(outputFile)) {
    const raw = readFileSync(outputFile, "utf8").trim();
    try {
      const parsed = GrokCliOutputSchema.parse(JSON.parse(raw));
      if (parsed.type === "error") {
        await abort(ctx, `Grok CLI returned an error: ${parsed.message ?? "unknown"}`, raw);
      }
      text = parsed.text ?? "";
    } catch {
      text = raw;
    }
  }

  if (exitCode !== "0" && !text) {
    await abort(
      ctx,
      `Grok CLI exited with code ${exitCode} and produced no output. ` +
        "Most likely the auth session expired — refresh the `GROK_AUTH_JSON` secret " +
        "(`grok login` on your machine, then copy `~/.grok/auth.json`).",
    );
  }
  return text;
};

const countsLine = (issues: Issue[]): string => {
  const count = (severity: Severity): number =>
    issues.filter((issue) => issue.severity === severity).length;
  return (
    `${SEVERITY_EMOJI.bug} **${count("bug")}** bugs · ` +
    `${SEVERITY_EMOJI.warning} **${count("warning")}** warnings · ` +
    `${SEVERITY_EMOJI.nit} **${count("nit")}** nits`
  );
};

const postCleanVerdict = async (ctx: Ctx, summary: string): Promise<void> => {
  const body = [
    "## :white_check_mark: Grok Build Review — no issues",
    "",
    pick(ctx.personality.clean),
    "",
    `> ${summary}`,
    "",
    footer(ctx),
  ].join("\n");
  await upsertStatusComment(ctx.repo, ctx.prNumber, body);
  emitOutputs("clean");
  console.log("No issues found.");
};

const postIssuesReview = async (ctx: Ctx, summary: string, issues: Issue[]): Promise<string> => {
  const diffLines = rightSideLines(readFileSync(workPath("pr.diff"), "utf8"));
  const inline = issues.filter(
    (issue) => issue.line !== null && diffLines.has(lineKey(issue.file, issue.line)),
  );
  const promoted = issues.filter((issue) => !inline.includes(issue));

  let body = `## Grok Build Review\n\n${summary}\n\n${countsLine(issues)}`;
  if (promoted.length > 0) {
    body +=
      "\n\n### Findings outside the diff\n\n" +
      promoted.map((issue) => renderIssue(issue, true)).join("\n\n---\n\n");
  }
  body += `\n\n${footer(ctx)}`;

  let result = await ghApi<PostedReview>("POST", `/repos/${ctx.repo}/pulls/${ctx.prNumber}/reviews`, {
    commit_id: ctx.headSha,
    event: "COMMENT",
    body,
    comments: inline.map((issue) => ({
      path: issue.file,
      line: issue.line,
      side: "RIGHT",
      body: renderIssue(issue),
    })),
  });

  if (!result.ok && result.status === 422 && inline.length > 0) {
    console.log(`::warning::Inline comments rejected (422), posting body-only review: ${result.error}`);
    const fallbackBody =
      `## Grok Build Review\n\n${summary}\n\n${countsLine(issues)}\n\n### Findings\n\n` +
      issues.map((issue) => renderIssue(issue, true)).join("\n\n---\n\n") +
      `\n\n${footer(ctx)}`;
    result = await ghApi<PostedReview>("POST", `/repos/${ctx.repo}/pulls/${ctx.prNumber}/reviews`, {
      commit_id: ctx.headSha,
      event: "COMMENT",
      body: fallbackBody,
    });
  }

  if (!result.ok) {
    await abort(ctx, `Failed to post review (HTTP ${result.status}): ${result.error}`);
    return "";
  }

  const reviewUrl = result.data.html_url ?? "";
  const statusBody = [
    `## :mag: Grok Build Review — ${plural(issues.length, "issue")} found`,
    "",
    pick(ctx.personality.notes),
    "",
    `> ${summary}`,
    "",
    countsLine(issues),
    "",
    `See the [review](${reviewUrl}) — ${plural(inline.length, "inline comment")}` +
      (promoted.length > 0 ? `, ${promoted.length} in the review body` : "") +
      ".",
    "",
    `<sub>[workflow run](${ctx.runUrl})</sub>`,
  ].join("\n");
  await upsertStatusComment(ctx.repo, ctx.prNumber, statusBody);

  console.log(`Posted review: ${inline.length} inline, ${promoted.length} promoted — ${reviewUrl}`);
  return reviewUrl;
};

export const cmdFinish = async (): Promise<void> => {
  const pr = readJsonFile(workPath("pr.json"), PrMetaSchema);
  const ctx: Ctx = {
    repo: requireEnv("GITHUB_REPOSITORY"),
    prNumber: requireEnv("PR_NUMBER"),
    runUrl: optionalEnv("RUN_URL"),
    headSha: pr.headRefOid,
    personality: PERSONALITIES[parseRoastLevel(process.env.ROAST_LEVEL)],
  };

  const text = await readGrokText(ctx);
  const review = extractReview(text);
  if (!review) {
    return abort(ctx, "Grok finished but did not produce a parseable review block.", text);
  }

  if (review.issues.length === 0) {
    return postCleanVerdict(ctx, review.summary);
  }

  const reviewUrl = await postIssuesReview(ctx, review.summary, review.issues);
  emitOutputs("issues", review.issues, reviewUrl);

  const failOn = optionalEnv("FAIL_ON", "never");
  const bugCount = review.issues.filter((issue) => issue.severity === "bug").length;
  if (failOn === "any" || (failOn === "bugs" && bugCount > 0)) {
    fail(`fail_on=${failOn}: ${bugCount} bugs / ${review.issues.length} issues found.`);
  }
};
