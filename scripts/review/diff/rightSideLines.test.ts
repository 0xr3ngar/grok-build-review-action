import { describe, expect, test } from "bun:test";

import { lineKey } from "./lineKey.ts";
import { rightSideLines } from "./rightSideLines.ts";

const DIFF = `diff --git a/src/app.js b/src/app.js
--- a/src/app.js
+++ b/src/app.js
@@ -10,4 +10,5 @@ function main() {
 context line
-removed line
+added line one
+added line two
 trailing context
@@ -42 +44 @@
+single line hunk
diff --git a/gone.js b/gone.js
--- a/gone.js
+++ /dev/null
@@ -1,2 +0,0 @@
-bye
-bye again
`;

describe("rightSideLines", () => {
    const lines = rightSideLines(DIFF);

    test("context and added lines are present", () => {
        expect(lines.has(lineKey("src/app.js", 10))).toBe(true);
        expect(lines.has(lineKey("src/app.js", 11))).toBe(true);
        expect(lines.has(lineKey("src/app.js", 12))).toBe(true);
        expect(lines.has(lineKey("src/app.js", 13))).toBe(true);
    });

    test("hunk headers without counts work", () => {
        expect(lines.has(lineKey("src/app.js", 44))).toBe(true);
    });

    test("left-side and phantom lines are absent", () => {
        expect(lines.has(lineKey("src/app.js", 14))).toBe(false);
        expect(lines.has(lineKey("src/app.js", 42))).toBe(false);
    });

    test("deleted files contribute nothing", () => {
        expect([...lines].some((key) => key.startsWith("gone.js"))).toBe(false);
    });
});
