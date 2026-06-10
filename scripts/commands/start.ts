import { optionalEnv, readJsonFile, requireEnv, workPath } from "../lib/env.ts";
import { upsertStatusComment } from "../lib/comment.ts";
import { PERSONALITIES, parseRoastLevel, pick } from "../lib/personality.ts";
import { PrMetaSchema } from "../types.ts";

export const cmdStart = async () => {
    const repo = requireEnv("GITHUB_REPOSITORY");
    const prNumber = requireEnv("PR_NUMBER");
    const runUrl = optionalEnv("RUN_URL");
    const personality = PERSONALITIES[parseRoastLevel(process.env.ROAST_LEVEL)];
    const pr = readJsonFile(workPath("pr.json"), PrMetaSchema);

    const body = [
        "## :eyes: Grok Build Review",
        "",
        pick(personality.cooking),
        "",
        `Reviewing commit \`${pr.headRefOid.slice(0, 7)}\` — results land here when it's done.`,
        "",
        `<sub>[workflow run](${runUrl})</sub>`,
    ].join("\n");

    await upsertStatusComment(repo, prNumber, body);
};
