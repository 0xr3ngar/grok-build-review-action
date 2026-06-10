import { countsLine } from "./countsLine.ts";
import { GROK_ICON } from "./grokIcon.ts";
import { pick } from "../personality/pick.ts";
import { plural } from "./plural.ts";
import { runFooter } from "./runFooter.ts";
import { shortSha } from "./shortSha.ts";
import type { Issue } from "../../schemas/issue.ts";
import type { Personality } from "../personality/personalities.ts";
import type { RenderContext } from "./context.ts";

export const buildIssuesStatusBody = (
    personality: Personality,
    summary: string,
    issues: Issue[],
    inlineCount: number,
    promotedCount: number,
    reviewUrl: string,
    ctx: RenderContext,
) =>
    [
        `## ${GROK_ICON} Grok Build Review — ${plural(issues.length, "issue")} found`,
        "",
        pick(personality.notes),
        "",
        `> ${summary}`,
        "",
        countsLine(issues),
        "",
        `See the [review](${reviewUrl}) — ${plural(inlineCount, "inline comment")}` +
            (promotedCount > 0 ? `, ${promotedCount} in the review body` : "") +
            `. Commit \`${shortSha(ctx.headSha)}\`.`,
        "",
        runFooter(ctx),
    ].join("\n");
