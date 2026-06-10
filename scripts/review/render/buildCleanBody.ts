import { GROK_ICON } from "./grokIcon.ts";
import { pick } from "../personality/pick.ts";
import { reviewFooter } from "./reviewFooter.ts";
import type { Personality } from "../personality/personalities.ts";
import type { RenderContext } from "./context.ts";

export const buildCleanBody = (personality: Personality, summary: string, ctx: RenderContext) =>
    [
        `## ${GROK_ICON} Grok Build Review — no issues`,
        "",
        pick(personality.clean),
        "",
        `> ${summary}`,
        "",
        reviewFooter(ctx),
    ].join("\n");
