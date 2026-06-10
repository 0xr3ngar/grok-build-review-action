import { GROK_ICON } from "./grokIcon.ts";
import { runFooter } from "./runFooter.ts";
import type { RenderContext } from "./context.ts";

const RAW_OUTPUT_PREVIEW_LIMIT = 3000;

export const buildFailureBody = (reason: string, rawText: string, ctx: RenderContext) => {
    const sections = [`## ${GROK_ICON} Grok Build Review — failed`, reason];
    if (rawText) {
        const preview = rawText.trim().slice(0, RAW_OUTPUT_PREVIEW_LIMIT);
        sections.push(
            `<details><summary>Raw output</summary>\n\n\`\`\`\n${preview}\n\`\`\`\n\n</details>`,
        );
    }
    sections.push(runFooter(ctx));
    return sections.join("\n\n");
};
