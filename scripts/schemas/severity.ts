import { z } from "zod";

export const SeveritySchema = z.enum(["bug", "warning", "nit"]);
export type Severity = z.infer<typeof SeveritySchema>;
