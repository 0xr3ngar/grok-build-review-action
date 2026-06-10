import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { optionalEnv, readJsonFile, requireEnv, workPath } from "../lib/env.ts";
import { PERSONALITIES, parseRoastLevel } from "../lib/personality.ts";
import { PrMetaSchema } from "../types.ts";

const TEMPLATE_PATH = path.join(import.meta.dir, "..", "prompt_template.md");
const REPO_DOCS = ["AGENTS.md", "CLAUDE.md"];
const REPO_DOC_CAP = 8 * 1024;

const truncate = (text: string, maxBytes: number, note: string): string => {
    if (Buffer.byteLength(text) <= maxBytes) return text;
    return `${Buffer.from(text).subarray(0, maxBytes).toString("utf8")}\n\n${note}`;
};

const repoInstructions = (): string => {
    const sections: string[] = [];

    const custom = optionalEnv("CUSTOM_INSTRUCTIONS").trim();
    if (custom) sections.push(`### From the workflow configuration\n\n${custom}`);

    const workspace = optionalEnv("GITHUB_WORKSPACE");
    if (workspace) {
        for (const name of REPO_DOCS) {
            const file = path.join(workspace, name);
            if (!existsSync(file)) continue;
            const content = truncate(
                readFileSync(file, "utf8").trim(),
                REPO_DOC_CAP,
                "[truncated]",
            );
            if (content) sections.push(`### From ${name} (repo root)\n\n${content}`);
        }
    }

    if (sections.length === 0) return "";
    return [
        "## Repository instructions",
        "",
        "Respect these repo-specific conventions and review preferences. They override the generic guidance below, but never the output contract.",
        "",
        sections.join("\n\n"),
        "",
    ].join("\n");
};

export const cmdPrompt = (): void => {
    const pr = readJsonFile(workPath("pr.json"), PrMetaSchema);
    const maxKb = Number(optionalEnv("MAX_DIFF_KB", "300"));
    const personality = PERSONALITIES[parseRoastLevel(process.env.ROAST_LEVEL)];

    const vars: Record<string, string | number> = {
        repo: requireEnv("GITHUB_REPOSITORY"),
        pr_number: pr.number,
        pr_title: pr.title,
        pr_body: pr.body.trim() || "(no description)",
        head_ref: pr.headRefName,
        base_ref: pr.baseRefName,
        head_sha: pr.headRefOid,
        additions: pr.additions,
        deletions: pr.deletions,
        changed_files: pr.changedFiles,
        personality: personality.promptInstructions,
        repo_instructions: repoInstructions(),
        diff: truncate(
            readFileSync(workPath("pr.diff"), "utf8"),
            maxKb * 1024,
            "[NOTE: diff truncated — use read_file to inspect the remaining changed files listed in the PR metadata]",
        ),
    };

    const prompt = readFileSync(TEMPLATE_PATH, "utf8").replace(
        /\$([a-z_]+)/g,
        (match, name: string) => (name in vars ? String(vars[name]) : match),
    );

    writeFileSync(workPath("prompt.md"), prompt);
    console.log(`Prompt written (${prompt.length} chars)`);
};
