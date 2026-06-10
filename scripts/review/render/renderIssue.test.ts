import { describe, expect, test } from "bun:test";

import { renderIssue } from "./renderIssue.ts";
import type { Issue } from "../../schemas/issue.ts";

describe("renderIssue", () => {
    const issue: Issue = {
        file: "src/app.js",
        line: 11,
        severity: "bug",
        title: "Off by one",
        body: "Loop bound is wrong",
        suggestion: "use <=",
        quip: "Counting is hard.",
    };

    test("includes severity, suggestion and quip", () => {
        const md = renderIssue(issue);
        expect(md).toContain("**[bug] Off by one**");
        expect(md).toContain("**Suggestion:** use <=");
        expect(md).toContain("> *Counting is hard.*");
    });

    test("location is opt-in", () => {
        expect(renderIssue(issue)).not.toContain("src/app.js:11");
        expect(renderIssue(issue, true)).toContain("`src/app.js:11`");
    });

    test("empty suggestion and quip are omitted", () => {
        const bare = renderIssue({ ...issue, suggestion: "", quip: "" });
        expect(bare).not.toContain("Suggestion");
        expect(bare).not.toContain("> *");
    });
});
