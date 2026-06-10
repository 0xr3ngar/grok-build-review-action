import { countsLine } from "./countsLine.ts";
import { GROK_ICON } from "./grokIcon.ts";
import { renderIssue } from "./renderIssue.ts";
import { reviewFooter } from "./reviewFooter.ts";
import type { Issue } from "../../schemas/issue.ts";
import type { RenderContext } from "./context.ts";

const ISSUE_SEPARATOR = "\n\n---\n\n";

export const buildReviewBody = (
    summary: string,
    issues: Issue[],
    promoted: Issue[],
    ctx: RenderContext,
) => {
    const sections = [`## ${GROK_ICON} Grok Build Review\n\n${summary}\n\n${countsLine(issues)}`];
    if (promoted.length > 0) {
        sections.push(
            "### Findings outside the diff\n\n" +
                promoted.map((issue) => renderIssue(issue, true)).join(ISSUE_SEPARATOR),
        );
    }
    sections.push(reviewFooter(ctx));
    return sections.join("\n\n");
};
