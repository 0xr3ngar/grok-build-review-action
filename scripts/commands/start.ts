import { optionalEnv } from "../utils/optionalEnv.ts";
import { requireEnv } from "../utils/requireEnv.ts";
import { readJsonFile } from "../utils/readJsonFile.ts";
import { WORK_FILES } from "../utils/workFiles.ts";
import { workPath } from "../utils/workPath.ts";
import { upsertStatusComment } from "../github/upsertStatusComment.ts";
import { PERSONALITIES } from "../review/personality/personalities.ts";
import { parseRoastLevel } from "../review/personality/parseRoastLevel.ts";
import { buildStartBody } from "../review/render/buildStartBody.ts";
import { PrMetaSchema } from "../schemas/prMeta.ts";

export const cmdStart = async () => {
    const repo = requireEnv("GITHUB_REPOSITORY");
    const prNumber = requireEnv("PR_NUMBER");
    const personality = PERSONALITIES[parseRoastLevel(process.env.ROAST_LEVEL)];
    const pr = readJsonFile(workPath(WORK_FILES.prMeta), PrMetaSchema);

    const body = buildStartBody(personality, {
        headSha: pr.headRefOid,
        runUrl: optionalEnv("RUN_URL"),
    });
    await upsertStatusComment(repo, prNumber, body);
};
