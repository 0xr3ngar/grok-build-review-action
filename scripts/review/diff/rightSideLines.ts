import { lineKey } from "./lineKey.ts";

const HUNK_HEADER_REGEX = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/;
const NEW_FILE_HEADER_PREFIX = "+++ ";
const NEW_FILE_PATH_PREFIX_REGEX = /^b\//;
const DELETED_FILE_TARGET = "/dev/null";
const NO_NEWLINE_MARKER_PREFIX = "\\ ";

export const rightSideLines = (diff: string) => {
    const lines = new Set<string>();
    let file: string | null = null;
    let rightLine = 0;
    let inHunk = false;

    for (const raw of diff.split("\n")) {
        if (raw.startsWith(NEW_FILE_HEADER_PREFIX)) {
            const target = raw.slice(NEW_FILE_HEADER_PREFIX.length).trim();
            file =
                target === DELETED_FILE_TARGET
                    ? null
                    : target.replace(NEW_FILE_PATH_PREFIX_REGEX, "");
            inHunk = false;
            continue;
        }

        const hunk = HUNK_HEADER_REGEX.exec(raw);
        if (hunk) {
            rightLine = Number(hunk[1] ?? "0");
            inHunk = true;
            continue;
        }

        if (!inHunk || file === null) continue;
        if (raw.startsWith(NO_NEWLINE_MARKER_PREFIX)) continue;
        if (raw.startsWith("-")) continue;

        if (raw.startsWith("+") || raw.startsWith(" ") || raw === "") {
            lines.add(lineKey(file, rightLine));
            rightLine++;
            continue;
        }

        inHunk = false;
    }
    return lines as ReadonlySet<string>;
};
