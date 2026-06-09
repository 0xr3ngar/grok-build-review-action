import { existsSync, readFileSync, writeFileSync } from "node:fs";

import { ghApi } from "./github.ts";
import { workPath } from "./env.ts";
import { MARKER } from "./personality.ts";

interface IssueComment {
  id: number;
  body: string | null;
}

const findMarkedComment = async (repo: string, prNumber: string): Promise<number | null> => {
  for (let page = 1; page <= 5; page++) {
    const result = await ghApi<IssueComment[]>(
      "GET",
      `/repos/${repo}/issues/${prNumber}/comments?per_page=100&page=${page}`,
    );
    if (!result.ok || result.data.length === 0) return null;
    const match = result.data.find((comment) => comment.body?.includes(MARKER));
    if (match) return match.id;
    if (result.data.length < 100) return null;
  }
  return null;
};

export const upsertStatusComment = async (
  repo: string,
  prNumber: string,
  markdown: string,
): Promise<void> => {
  const body = `${MARKER}\n${markdown}`;
  const cacheFile = workPath("status_comment_id");

  let commentId: number | null = null;
  if (existsSync(cacheFile)) {
    commentId = Number(readFileSync(cacheFile, "utf8").trim()) || null;
  }
  commentId ??= await findMarkedComment(repo, prNumber);

  if (commentId !== null) {
    const updated = await ghApi("PATCH", `/repos/${repo}/issues/comments/${commentId}`, { body });
    if (updated.ok) return;
  }

  const created = await ghApi<IssueComment>("POST", `/repos/${repo}/issues/${prNumber}/comments`, {
    body,
  });
  if (!created.ok) {
    console.log(`::warning::Could not post status comment (HTTP ${created.status}): ${created.error}`);
    return;
  }
  writeFileSync(cacheFile, String(created.data.id));
};
