import type { RenderContext } from "./context.ts";

export const runFooter = (ctx: RenderContext) => `<sub>[workflow run](${ctx.runUrl})</sub>`;
