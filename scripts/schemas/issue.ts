import { z } from "zod";

import { SeveritySchema } from "./severity.ts";

const LEADING_PATH_PREFIX_REGEX = /^(?:\.\/)?(?:[ab]\/)?/;
const TITLE_FALLBACK_MAX_LENGTH = 80;

const trimmed = z.string().transform((value) => value.trim());

export const IssueSchema = z
    .object({
        file: trimmed.transform((value) => value.replace(LEADING_PATH_PREFIX_REGEX, "")),
        line: z.preprocess(
            (value) => (value == null ? null : Number.parseInt(String(value), 10)),
            z.number().int().nullable().catch(null),
        ),
        severity: z.preprocess(
            (value) => String(value ?? "").toLowerCase(),
            SeveritySchema.catch("warning"),
        ),
        title: trimmed.catch(""),
        body: trimmed.catch(""),
        suggestion: trimmed.catch(""),
        quip: trimmed.catch(""),
    })
    .refine((issue) => issue.file !== "" && (issue.title !== "" || issue.body !== ""))
    .transform((issue) => ({
        ...issue,
        title: issue.title || issue.body.slice(0, TITLE_FALLBACK_MAX_LENGTH),
    }));
export type Issue = z.infer<typeof IssueSchema>;
