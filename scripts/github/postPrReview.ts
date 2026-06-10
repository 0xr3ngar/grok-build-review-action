import { ghApi } from "./ghApi.ts";

const HTTP_UNPROCESSABLE_ENTITY = 422;
const REVIEW_EVENT = "COMMENT";

interface PostedReview {
    html_url?: string;
}

interface ReviewTarget {
    repo: string;
    prNumber: string;
    headSha: string;
}

export interface InlineComment {
    path: string;
    line: number;
    side: "RIGHT";
    body: string;
}

export const postPrReview = async (
    target: ReviewTarget,
    body: string,
    comments: InlineComment[],
    fallbackBody: string,
) => {
    const reviewsPath = `/repos/${target.repo}/pulls/${target.prNumber}/reviews`;

    const first = await ghApi<PostedReview>("POST", reviewsPath, {
        commit_id: target.headSha,
        event: REVIEW_EVENT,
        body,
        comments,
    });
    if (first.ok) return { ok: true as const, reviewUrl: first.data.html_url ?? "" };
    if (first.status !== HTTP_UNPROCESSABLE_ENTITY || comments.length === 0) {
        return { ok: false as const, status: first.status, error: first.error };
    }

    console.log(
        `::warning::Inline comments rejected (422), posting body-only review: ${first.error}`,
    );
    const second = await ghApi<PostedReview>("POST", reviewsPath, {
        commit_id: target.headSha,
        event: REVIEW_EVENT,
        body: fallbackBody,
    });
    if (second.ok) return { ok: true as const, reviewUrl: second.data.html_url ?? "" };
    return { ok: false as const, status: second.status, error: second.error };
};
