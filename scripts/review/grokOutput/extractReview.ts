import { z } from "zod";

import { IssueSchema } from "../../schemas/issue.ts";
import type { Issue } from "../../schemas/issue.ts";
import type { GrokReview } from "../../schemas/grokReview.ts";

const REVIEW_BLOCK_REGEX = /<<<GROK_REVIEW>>>\s*(\{[\s\S]*?\})\s*<<<END_GROK_REVIEW>>>/g;

const trimmed = z.string().transform((value) => value.trim());

const ReviewBlockSchema = z.object({
    summary: trimmed.catch(""),
    issues: z.array(z.unknown()).catch([]),
});

export const extractReview = (text: string): GrokReview | null => {
    const lastBlock = [...text.matchAll(REVIEW_BLOCK_REGEX)].at(-1)?.[1];
    if (!lastBlock) return null;

    let parsed;
    try {
        parsed = ReviewBlockSchema.parse(JSON.parse(lastBlock));
    } catch {
        return null;
    }

    const issues = parsed.issues.flatMap((entry): Issue[] => {
        const result = IssueSchema.safeParse(entry);
        return result.success ? [result.data] : [];
    });
    return { summary: parsed.summary, issues };
};
