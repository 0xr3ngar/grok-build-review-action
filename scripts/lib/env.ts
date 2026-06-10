import { appendFileSync, readFileSync } from "node:fs";
import path from "node:path";
import type { ZodType } from "zod";

export const fail: (message: string) => never = (message) => {
    console.log(`::error::${message}`);
    process.exit(1);
};

export const requireEnv = (name: string): string => {
    const value = process.env[name];
    if (value === undefined) fail(`Missing required env var ${name}`);
    return value;
};

export const optionalEnv = (name: string, fallback = ""): string => process.env[name] ?? fallback;

export const workPath = (...parts: string[]): string => path.join(requireEnv("WORK"), ...parts);

export const readJsonFile = <T>(file: string, schema: ZodType<T>): T =>
    schema.parse(JSON.parse(readFileSync(file, "utf8")));

export const setOutput = (name: string, value: string | number): void => {
    const file = process.env.GITHUB_OUTPUT;
    if (file) appendFileSync(file, `${name}=${value}\n`);
};
