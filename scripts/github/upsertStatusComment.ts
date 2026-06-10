import { existsSync, readFileSync, writeFileSync } from "node:fs";

import { ghApi } from "./ghApi.ts";
import { STATUS_COMMENT_MARKER } from "./statusCommentMarker.ts";
import { WORK_FILES } from "../utils/workFiles.ts";
import { workPath } from "../utils/workPath.ts";

const COMMENTS_PER_PAGE = 100;
const MAX_SEARCH_PAGES = 5;

interface IssueComment {
    id: number;
    body: string | null;
}

const readCachedCommentId = () => {
    const cacheFile = workPath(WORK_FILES.statusCommentId);
    if (!existsSync(cacheFile)) return null;
    return Number(readFileSync(cacheFile, "utf8").trim()) || null;
};

const cacheCommentId = (commentId: number) => {
    writeFileSync(workPath(WORK_FILES.statusCommentId), String(commentId));
};

const findMarkedCommentId = async (repo: string, prNumber: string) => {
    for (let page = 1; page <= MAX_SEARCH_PAGES; page++) {
        const result = await ghApi<IssueComment[]>(
            "GET",
            `/repos/${repo}/issues/${prNumber}/comments?per_page=${COMMENTS_PER_PAGE}&page=${page}`,
        );
        if (!result.ok || result.data.length === 0) return null;

        const match = result.data.find((comment) => comment.body?.includes(STATUS_COMMENT_MARKER));
        if (match) return match.id;
        if (result.data.length < COMMENTS_PER_PAGE) return null;
    }
    return null;
};

const updateComment = async (repo: string, commentId: number, body: string) => {
    const result = await ghApi("PATCH", `/repos/${repo}/issues/comments/${commentId}`, { body });
    return result.ok;
};

const createComment = async (repo: string, prNumber: string, body: string) => {
    const result = await ghApi<IssueComment>("POST", `/repos/${repo}/issues/${prNumber}/comments`, {
        body,
    });
    if (!result.ok) {
        console.log(
            `::warning::Could not post status comment (HTTP ${result.status}): ${result.error}`,
        );
        return;
    }
    cacheCommentId(result.data.id);
};

export const upsertStatusComment = async (repo: string, prNumber: string, markdown: string) => {
    const body = `${STATUS_COMMENT_MARKER}\n${markdown}`;

    const commentId = readCachedCommentId() ?? (await findMarkedCommentId(repo, prNumber));
    if (commentId !== null && (await updateComment(repo, commentId, body))) return;

    await createComment(repo, prNumber, body);
};
