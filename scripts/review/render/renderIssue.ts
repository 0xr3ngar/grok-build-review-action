import { SEVERITY_EMOJI } from "./severityEmoji.ts";
import type { Issue } from "../../schemas/issue.ts";

export const renderIssue = (issue: Issue, withLocation = false) => {
    const location = withLocation ? ` — \`${issue.file}:${issue.line}\`` : "";
    const parts = [
        `${SEVERITY_EMOJI[issue.severity]} **[${issue.severity}] ${issue.title}**${location}`,
        issue.body,
    ];
    if (issue.suggestion) parts.push(`**Suggestion:** ${issue.suggestion}`);
    if (issue.quip) parts.push(`> *${issue.quip}*`);
    return parts.join("\n\n");
};
