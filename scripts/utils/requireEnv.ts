import { fail } from "./fail.ts";

export const requireEnv = (name: string) => {
    const value = process.env[name];
    if (value !== undefined) return value;
    return fail(`Missing required env var ${name}`);
};
