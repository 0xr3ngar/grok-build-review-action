import { existsSync, readFileSync } from "node:fs";
import { z } from "zod";

import { WORK_FILES } from "../../utils/workFiles.ts";
import { workPath } from "../../utils/workPath.ts";

const MISSING_OUTPUT_EXIT_CODE = "1";

const CliOutputSchema = z.object({
    type: z.string().optional(),
    message: z.string().optional(),
    text: z.string().optional(),
});

const parseCliOutput = (raw: string) => {
    try {
        return CliOutputSchema.parse(JSON.parse(raw));
    } catch {
        return null;
    }
};

export const readGrokRun = () => {
    const exitFile = workPath(WORK_FILES.grokExitCode);
    const exitCode = existsSync(exitFile)
        ? readFileSync(exitFile, "utf8").trim()
        : MISSING_OUTPUT_EXIT_CODE;

    const outputFile = workPath(WORK_FILES.grokOutput);
    if (!existsSync(outputFile)) return { exitCode, text: "", cliErrorMessage: null };

    const raw = readFileSync(outputFile, "utf8").trim();
    const parsed = parseCliOutput(raw);
    if (!parsed) return { exitCode, text: raw, cliErrorMessage: null };
    if (parsed.type === "error") {
        return { exitCode, text: raw, cliErrorMessage: parsed.message ?? "unknown" };
    }
    return { exitCode, text: parsed.text ?? "", cliErrorMessage: null };
};
