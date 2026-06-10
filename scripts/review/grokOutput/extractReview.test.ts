import { describe, expect, test } from "bun:test";

import { extractReview } from "./extractReview.ts";

const wrap = (json: string) =>
    `Some preamble from grok...\n<<<GROK_REVIEW>>>\n${json}\n<<<END_GROK_REVIEW>>>`;

describe("extractReview", () => {
    test("parses and normalizes a full block", () => {
        const review = extractReview(
            wrap(`{
        "summary": "Looks mostly fine.",
        "issues": [
          {"file": "b/src/app.js", "line": 11, "severity": "BUG", "title": "Off by one", "body": "Loop bound is wrong", "suggestion": "use <=", "quip": "An off-by-one in 2026? Bold."},
          {"file": "./src/app.js", "line": "12", "severity": "mystery", "title": "", "body": "naming"},
          {"file": "", "line": 1, "severity": "bug", "title": "dropme", "body": "no file"}
        ]
      }`),
        );

        expect(review).not.toBeNull();
        expect(review!.summary).toBe("Looks mostly fine.");
        expect(review!.issues).toHaveLength(2);

        const [first, second] = review!.issues;
        expect(first!.file).toBe("src/app.js");
        expect(first!.severity).toBe("bug");
        expect(first!.quip).toBe("An off-by-one in 2026? Bold.");
        expect(second!.line).toBe(12);
        expect(second!.severity).toBe("warning");
        expect(second!.title).toBe("naming");
    });

    test("returns null without a block or with broken JSON", () => {
        expect(extractReview("no block here")).toBeNull();
        expect(extractReview(wrap("{not json"))).toBeNull();
    });

    test("uses the last block when several exist", () => {
        const text =
            wrap(`{"summary": "first", "issues": []}`) +
            "\n" +
            wrap(`{"summary": "second", "issues": []}`);
        expect(extractReview(text)!.summary).toBe("second");
    });
});
