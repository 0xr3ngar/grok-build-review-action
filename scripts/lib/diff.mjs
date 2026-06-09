import { stripPrefix } from "./env.mjs";

const HUNK_RE = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/;

export const lineKey = (file, line) => `${file}\u0000${line}`;

export const rightSideLines = (diffText) => {
  const pairs = new Set();
  let currentFile = null;
  let lineNo = 0;
  let inHunk = false;
  for (const raw of diffText.split("\n")) {
    if (raw.startsWith("+++ ")) {
      const p = raw.slice(4).trim();
      currentFile = p === "/dev/null" ? null : stripPrefix(p, "b/");
      inHunk = false;
      continue;
    }
    const m = HUNK_RE.exec(raw);
    if (m) {
      lineNo = parseInt(m[1], 10);
      inHunk = true;
      continue;
    }
    if (!inHunk || currentFile === null) continue;
    if (raw.startsWith("\\ ")) continue;
    if (raw.startsWith("+")) {
      pairs.add(lineKey(currentFile, lineNo));
      lineNo++;
    } else if (raw.startsWith("-")) {
    } else if (raw.startsWith(" ") || raw === "") {
      pairs.add(lineKey(currentFile, lineNo));
      lineNo++;
    } else {
      inHunk = false;
    }
  }
  return pairs;
}
