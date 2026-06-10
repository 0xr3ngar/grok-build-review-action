import { SEVERITY_EMOJI } from "./severityEmoji.ts";
import type { Issue } from "../../schemas/issue.ts";
import type { Severity } from "../../schemas/severity.ts";

export const countsLine = (issues: Issue[]) => {
    const count = (severity: Severity) =>
        issues.filter((issue) => issue.severity === severity).length;
    return (
        `${SEVERITY_EMOJI.bug} **${count("bug")}** bugs · ` +
        `${SEVERITY_EMOJI.warning} **${count("warning")}** warnings · ` +
        `${SEVERITY_EMOJI.nit} **${count("nit")}** nits`
    );
};
