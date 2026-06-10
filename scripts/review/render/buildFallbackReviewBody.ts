import { countsLine } from "./countsLine.ts";
import { GROK_ICON } from "./grokIcon.ts";
import { renderIssue } from "./renderIssue.ts";
import { reviewFooter } from "./reviewFooter.ts";
import type { Issue } from "../../schemas/issue.ts";
import type { RenderContext } from "./context.ts";

const ISSUE_SEPARATOR = "\n\n---\n\n";

export const buildFallbackReviewBody = (summary: string, issues: Issue[], ctx: RenderContext) =>
    [
        `## ${GROK_ICON} Grok Build Review\n\n${summary}\n\n${countsLine(issues)}`,
        `### Findings\n\n${issues.map((issue) => renderIssue(issue, true)).join(ISSUE_SEPARATOR)}`,
        reviewFooter(ctx),
    ].join("\n\n");
