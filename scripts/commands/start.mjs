
import { env, readJson, workPath } from "../lib/env.mjs";
import { upsertStatusComment } from "../lib/comment.mjs";
import { COOKING_LINES, pick } from "../lib/messages.mjs";

export const cmdStart = async () => {
  const repo = env("GITHUB_REPOSITORY");
  const prNumber = env("PR_NUMBER");
  const runUrl = env("RUN_URL", "");
  const pr = readJson(workPath("pr.json"));
  const head = (pr.headRefOid || "").slice(0, 7);
  const body =
    `## :eyes: Grok Build Review\n\n` +
    `${pick(COOKING_LINES)}\n\n` +
    `Reviewing commit \`${head}\` — results land here when it's done.\n\n` +
    `<sub>[workflow run](${runUrl})</sub>`;
  await upsertStatusComment(repo, prNumber, body);
}
