import { readFileSync } from "node:fs";

import { fail } from "../utils/fail.ts";
import { optionalEnv } from "../utils/optionalEnv.ts";
import { requireEnv } from "../utils/requireEnv.ts";
import { readJsonFile } from "../utils/readJsonFile.ts";
import { setOutput } from "../utils/setOutput.ts";
import { WORK_FILES } from "../utils/workFiles.ts";
import { workPath } from "../utils/workPath.ts";
import { upsertStatusComment } from "../github/upsertStatusComment.ts";
import { postPrReview } from "../github/postPrReview.ts";
import type { InlineComment } from "../github/postPrReview.ts";
import { lineKey } from "../review/diff/lineKey.ts";
import { rightSideLines } from "../review/diff/rightSideLines.ts";
import { extractReview } from "../review/grokOutput/extractReview.ts";
import { readGrokRun } from "../review/grokOutput/readGrokRun.ts";
import { PERSONALITIES } from "../review/personality/personalities.ts";
import { parseRoastLevel } from "../review/personality/parseRoastLevel.ts";
import { buildCleanBody } from "../review/render/buildCleanBody.ts";
import { buildFailureBody } from "../review/render/buildFailureBody.ts";
import { buildFallbackReviewBody } from "../review/render/buildFallbackReviewBody.ts";
import { buildIssuesStatusBody } from "../review/render/buildIssuesStatusBody.ts";
import { buildReviewBody } from "../review/render/buildReviewBody.ts";
import { renderIssue } from "../review/render/renderIssue.ts";
import { PrMetaSchema } from "../schemas/prMeta.ts";
import type { GrokReview } from "../schemas/grokReview.ts";
import type { Issue } from "../schemas/issue.ts";
import type { Verdict } from "../schemas/verdict.ts";
import type { Personality } from "../review/personality/personalities.ts";

const AUTH_EXPIRED_HINT =
    "Most likely the auth session expired — run `grok login` on your machine, copy `~/.grok/auth.json` " +
    "into `GROK_AUTH_JSON`, or enable `sync_auth_secret` so refreshed tokens are written back automatically.";

interface FinishContext {
    repo: string;
    prNumber: string;
    runUrl: string;
    headSha: string;
    personality: Personality;
}

const emitOutputs = (verdict: Verdict, issues: Issue[] = [], reviewUrl = "") => {
    setOutput("verdict", verdict);
    setOutput("issue_count", issues.length);
    setOutput("bug_count", issues.filter((issue) => issue.severity === "bug").length);
    setOutput("review_url", reviewUrl);
};

const abort = async (ctx: FinishContext, reason: string, rawText = "") => {
    await upsertStatusComment(ctx.repo, ctx.prNumber, buildFailureBody(reason, rawText, ctx));
    emitOutputs("error");
    return fail(reason);
};

const finishClean = async (ctx: FinishContext, summary: string) => {
    await upsertStatusComment(
        ctx.repo,
        ctx.prNumber,
        buildCleanBody(ctx.personality, summary, ctx),
    );
    emitOutputs("clean");
    console.log("No issues found.");
};

const partitionByDiff = (issues: Issue[]) => {
    const diffLines = rightSideLines(readFileSync(workPath(WORK_FILES.prDiff), "utf8"));
    const comments: InlineComment[] = [];
    const promoted: Issue[] = [];

    for (const issue of issues) {
        if (issue.line !== null && diffLines.has(lineKey(issue.file, issue.line))) {
            comments.push({
                path: issue.file,
                line: issue.line,
                side: "RIGHT",
                body: renderIssue(issue),
            });
            continue;
        }
        promoted.push(issue);
    }
    return { comments, promoted };
};

const applyFailGate = (issues: Issue[]) => {
    const failOn = optionalEnv("FAIL_ON", "never");
    const bugCount = issues.filter((issue) => issue.severity === "bug").length;
    if (failOn !== "any" && (failOn !== "bugs" || bugCount === 0)) return;

    fail(`fail_on=${failOn}: ${bugCount} bugs / ${issues.length} issues found.`);
};

const finishWithIssues = async (ctx: FinishContext, review: GrokReview) => {
    const { comments, promoted } = partitionByDiff(review.issues);

    const result = await postPrReview(
        ctx,
        buildReviewBody(review.summary, review.issues, promoted, ctx),
        comments,
        buildFallbackReviewBody(review.summary, review.issues, ctx),
    );
    if (!result.ok) {
        return abort(ctx, `Failed to post review (HTTP ${result.status}): ${result.error}`);
    }

    const statusBody = buildIssuesStatusBody(
        ctx.personality,
        review.summary,
        review.issues,
        comments.length,
        promoted.length,
        result.reviewUrl,
        ctx,
    );
    await upsertStatusComment(ctx.repo, ctx.prNumber, statusBody);
    emitOutputs("issues", review.issues, result.reviewUrl);
    console.log(
        `Posted review: ${comments.length} inline, ${promoted.length} promoted — ${result.reviewUrl}`,
    );

    applyFailGate(review.issues);
};

export const cmdFinish = async () => {
    const pr = readJsonFile(workPath(WORK_FILES.prMeta), PrMetaSchema);
    const ctx: FinishContext = {
        repo: requireEnv("GITHUB_REPOSITORY"),
        prNumber: requireEnv("PR_NUMBER"),
        runUrl: optionalEnv("RUN_URL"),
        headSha: pr.headRefOid,
        personality: PERSONALITIES[parseRoastLevel(process.env.ROAST_LEVEL)],
    };

    const run = readGrokRun();
    if (run.cliErrorMessage !== null) {
        return abort(ctx, `Grok CLI returned an error: ${run.cliErrorMessage}`, run.text);
    }
    if (run.exitCode !== "0" && !run.text) {
        return abort(
            ctx,
            `Grok CLI exited with code ${run.exitCode} and produced no output. ${AUTH_EXPIRED_HINT}`,
        );
    }

    const review = extractReview(run.text);
    if (!review) {
        return abort(ctx, "Grok finished but did not produce a parseable review block.", run.text);
    }

    if (review.issues.length === 0) return finishClean(ctx, review.summary);
    return finishWithIssues(ctx, review);
};
