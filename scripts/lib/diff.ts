const HUNK_HEADER = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/;

export const lineKey = (file: string, line: number): string => `${file}\u0000${line}`;

export const rightSideLines = (diff: string): ReadonlySet<string> => {
  const lines = new Set<string>();
  let file: string | null = null;
  let rightLine = 0;
  let inHunk = false;

  for (const raw of diff.split("\n")) {
    if (raw.startsWith("+++ ")) {
      const target = raw.slice(4).trim();
      file = target === "/dev/null" ? null : target.replace(/^b\//, "");
      inHunk = false;
      continue;
    }

    const hunk = HUNK_HEADER.exec(raw);
    if (hunk) {
      rightLine = Number(hunk[1] ?? "0");
      inHunk = true;
      continue;
    }

    if (!inHunk || file === null) continue;

    const isNoNewlineMarker = raw.startsWith("\\ ");
    if (isNoNewlineMarker) continue;

    if (raw.startsWith("+") || raw.startsWith(" ") || raw === "") {
      lines.add(lineKey(file, rightLine));
      rightLine++;
    } else if (!raw.startsWith("-")) {
      inHunk = false;
    }
  }
  return lines;
};
