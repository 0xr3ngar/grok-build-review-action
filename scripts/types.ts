import { z } from "zod";

export const SeveritySchema = z.enum(["bug", "warning", "nit"]);
export type Severity = z.infer<typeof SeveritySchema>;

export const RoastLevelSchema = z.enum(["professional", "playful", "savage", "diabolical"]);
export type RoastLevel = z.infer<typeof RoastLevelSchema>;

export type Verdict = "clean" | "issues" | "error";

const trimmed = z.string().transform((value) => value.trim());

export const PrMetaSchema = z.object({
  number: z.number(),
  title: z.string(),
  body: z.string().catch(""),
  headRefName: z.string(),
  baseRefName: z.string(),
  headRefOid: z.string(),
  additions: z.number(),
  deletions: z.number(),
  changedFiles: z.number(),
});
export type PrMeta = z.infer<typeof PrMetaSchema>;

export const IssueSchema = z
  .object({
    file: trimmed.transform((value) => value.replace(/^(?:\.\/)?(?:[ab]\/)?/, "")),
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
  .transform((issue) => ({ ...issue, title: issue.title || issue.body.slice(0, 80) }));
export type Issue = z.infer<typeof IssueSchema>;

export const GrokReviewBlockSchema = z.object({
  summary: trimmed.catch(""),
  issues: z.array(z.unknown()).catch([]),
});

export interface GrokReview {
  summary: string;
  issues: Issue[];
}

export const GrokCliOutputSchema = z.object({
  type: z.string().optional(),
  message: z.string().optional(),
  text: z.string().optional(),
});

export interface Personality {
  cooking: readonly string[];
  clean: readonly string[];
  notes: readonly string[];
  promptInstructions: string;
}
