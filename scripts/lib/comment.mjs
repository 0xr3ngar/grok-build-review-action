import fs from "node:fs";

import { ghApi } from "./github.mjs";
import { workPath } from "./env.mjs";
import { MARKER } from "./messages.mjs";

export const upsertStatusComment = async (repo, prNumber, body) => {
  body = `${MARKER}\n${body}`;
  let commentId = null;
  const idFile = workPath("status_comment_id");
  if (fs.existsSync(idFile)) {
    commentId = fs.readFileSync(idFile, "utf8").trim() || null;
  }

  if (commentId === null) {
    for (let page = 1; page <= 5; page++) {
      const [status, comments] = await ghApi(
        "GET",
        `/repos/${repo}/issues/${prNumber}/comments?per_page=100&page=${page}`,
      );
      if (status !== 200 || !Array.isArray(comments) || comments.length === 0) break;
      const found = comments.find((c) => (c.body || "").includes(MARKER));
      if (found) {
        commentId = String(found.id);
        break;
      }
      if (comments.length < 100) break;
    }
  }

  if (commentId) {
    const [status] = await ghApi("PATCH", `/repos/${repo}/issues/comments/${commentId}`, { body });
    if (status === 200) return commentId;
    // Comment may have been deleted; fall through to create.
  }

  const [status, resp] = await ghApi("POST", `/repos/${repo}/issues/${prNumber}/comments`, { body });
  if (status !== 201) {
    console.log(`::warning::Could not post status comment (HTTP ${status}): ${resp._error ?? ""}`);
    return null;
  }
  commentId = String(resp.id);
  fs.writeFileSync(idFile, commentId);
  return commentId;
}
