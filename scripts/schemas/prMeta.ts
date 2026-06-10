import { z } from "zod";

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
