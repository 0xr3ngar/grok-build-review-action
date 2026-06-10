import type { Issue } from "./issue.ts";

export interface GrokReview {
    summary: string;
    issues: Issue[];
}
