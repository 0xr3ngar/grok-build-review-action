import { GROK_ICON } from "./grokIcon.ts";
import { pick } from "../personality/pick.ts";
import { runFooter } from "./runFooter.ts";
import { shortSha } from "./shortSha.ts";
import type { Personality } from "../personality/personalities.ts";
import type { RenderContext } from "./context.ts";

export const buildStartBody = (personality: Personality, ctx: RenderContext) =>
    [
        `## ${GROK_ICON} Grok Build Review`,
        "",
        pick(personality.cooking),
        "",
        `Reviewing commit \`${shortSha(ctx.headSha)}\` — results land here when it's done.`,
        "",
        runFooter(ctx),
    ].join("\n");
