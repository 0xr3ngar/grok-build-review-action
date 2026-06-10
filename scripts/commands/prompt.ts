import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { optionalEnv } from "../utils/optionalEnv.ts";
import { requireEnv } from "../utils/requireEnv.ts";
import { readJsonFile } from "../utils/readJsonFile.ts";
import { WORK_FILES } from "../utils/workFiles.ts";
import { workPath } from "../utils/workPath.ts";
import { PERSONALITIES } from "../review/personality/personalities.ts";
import { parseRoastLevel } from "../review/personality/parseRoastLevel.ts";
import { PrMetaSchema } from "../schemas/prMeta.ts";

const TEMPLATE_PATH = path.join(import.meta.dir, "..", "prompt_template.md");
const TEMPLATE_VAR_REGEX = /\$([a-z_]+)/g;
const REPO_DOC_FILES = ["AGENTS.md", "CLAUDE.md"];
const REPO_DOC_MAX_BYTES = 8 * 1024;
const DEFAULT_MAX_DIFF_KB = "300";
const DOC_TRUNCATION_NOTE = "[truncated]";
const DIFF_TRUNCATION_NOTE =
    "[NOTE: diff truncated — use read_file to inspect the remaining changed files listed in the PR metadata]";

const truncate = (text: string, maxBytes: number, note: string) => {
    if (Buffer.byteLength(text) <= maxBytes) return text;
    return `${Buffer.from(text).subarray(0, maxBytes).toString("utf8")}\n\n${note}`;
};

const repoDocSections = () => {
    const workspace = optionalEnv("GITHUB_WORKSPACE");
    if (!workspace) return [];

    const sections: string[] = [];
    for (const name of REPO_DOC_FILES) {
        const file = path.join(workspace, name);
        if (!existsSync(file)) continue;

        const content = truncate(
            readFileSync(file, "utf8").trim(),
            REPO_DOC_MAX_BYTES,
            DOC_TRUNCATION_NOTE,
        );
        if (content) sections.push(`### From ${name} (repo root)\n\n${content}`);
    }
    return sections;
};

const repoInstructions = () => {
    const sections: string[] = [];

    const custom = optionalEnv("CUSTOM_INSTRUCTIONS").trim();
    if (custom) sections.push(`### From the workflow configuration\n\n${custom}`);
    sections.push(...repoDocSections());

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

export const cmdPrompt = () => {
    const pr = readJsonFile(workPath(WORK_FILES.prMeta), PrMetaSchema);
    const maxDiffBytes = Number(optionalEnv("MAX_DIFF_KB", DEFAULT_MAX_DIFF_KB)) * 1024;
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
            readFileSync(workPath(WORK_FILES.prDiff), "utf8"),
            maxDiffBytes,
            DIFF_TRUNCATION_NOTE,
        ),
    };

    const prompt = readFileSync(TEMPLATE_PATH, "utf8").replace(
        TEMPLATE_VAR_REGEX,
        (match, name: string) => (name in vars ? String(vars[name]) : match),
    );

    writeFileSync(workPath(WORK_FILES.prompt), prompt);
    console.log(`Prompt written (${prompt.length} chars)`);
};
