import type { RenderContext } from "./context.ts";
import { shortSha } from "./shortSha.ts";

export const reviewFooter = (ctx: RenderContext) =>
    `<sub>Reviewed commit \`${shortSha(ctx.headSha)}\` · [workflow run](${ctx.runUrl})</sub>`;
