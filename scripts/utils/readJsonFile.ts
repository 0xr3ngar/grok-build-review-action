import { readFileSync } from "node:fs";
import type { ZodType } from "zod";

export const readJsonFile = <T>(file: string, schema: ZodType<T>) =>
    schema.parse(JSON.parse(readFileSync(file, "utf8")));
