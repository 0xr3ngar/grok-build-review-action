import { GrokReviewBlockSchema, IssueSchema } from "../types.ts";
import type { GrokReview, Issue } from "../types.ts";
import { SEVERITY_EMOJI } from "./personality.ts";

const REVIEW_BLOCK = /<<<GROK_REVIEW>>>\s*(\{[\s\S]*?\})\s*<<<END_GROK_REVIEW>>>/g;

export const extractReview = (text: string): GrokReview | null => {
    const lastBlock = [...text.matchAll(REVIEW_BLOCK)].at(-1)?.[1];
    if (!lastBlock) return null;
    try {
        const { summary, issues } = GrokReviewBlockSchema.parse(JSON.parse(lastBlock));
        return {
            summary,
            issues: issues.flatMap((entry): Issue[] => {
                const result = IssueSchema.safeParse(entry);
                return result.success ? [result.data] : [];
            }),
        };
    } catch {
        return null;
    }
};

export const renderIssue = (issue: Issue, withLocation = false): string => {
    const location = withLocation ? ` — \`${issue.file}:${issue.line}\`` : "";
    const parts = [
        `${SEVERITY_EMOJI[issue.severity]} **[${issue.severity}] ${issue.title}**${location}`,
        issue.body,
    ];
    if (issue.suggestion) parts.push(`**Suggestion:** ${issue.suggestion}`);
    if (issue.quip) parts.push(`> *${issue.quip}*`);
    return parts.join("\n\n");
};
