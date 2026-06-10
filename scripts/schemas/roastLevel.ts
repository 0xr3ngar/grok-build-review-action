import { z } from "zod";

export const RoastLevelSchema = z.enum(["professional", "playful", "savage", "diabolical"]);
export type RoastLevel = z.infer<typeof RoastLevelSchema>;
