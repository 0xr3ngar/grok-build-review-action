import { RoastLevelSchema } from "../../schemas/roastLevel.ts";

export const parseRoastLevel = (raw: string | undefined) => {
    const parsed = RoastLevelSchema.safeParse((raw ?? "").trim().toLowerCase());
    if (parsed.success) return parsed.data;

    if (raw?.trim()) console.log(`::warning::Unknown roast_level '${raw}', using 'playful'.`);
    return "playful" as const;
};
