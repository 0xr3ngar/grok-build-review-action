import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { refreshAuthFileIfNeeded } from "../auth/grokAuth.ts";
import { optionalEnv } from "../utils/optionalEnv.ts";
import { requireEnv } from "../utils/requireEnv.ts";

const syncRefreshedAuthToSecret = (authPath: string) => {
    const token = requireEnv("SECRET_SYNC_TOKEN");
    const repo = requireEnv("GITHUB_REPOSITORY");
    const secretName = optionalEnv("SECRET_SYNC_NAME") || "GROK_AUTH_JSON";
    const authJson = readFileSync(authPath, "utf8");

    const result = spawnSync("gh", ["secret", "set", secretName, "--repo", repo], {
        input: authJson,
        encoding: "utf8",
        env: { ...process.env, GH_TOKEN: token },
    });

    if (result.status !== 0) {
        throw new Error(result.stderr?.trim() || "gh secret set failed");
    }

    console.log(`Updated repository secret ${secretName} with refreshed auth.json`);
};

export const cmdAuth = async () => {
    const authPath = optionalEnv("GROK_AUTH_PATH") || `${process.env.HOME}/.grok/auth.json`;
    const force = optionalEnv("GROK_AUTH_FORCE_REFRESH") === "1";
    const result = await refreshAuthFileIfNeeded(authPath, { force });

    if (result.refreshed) {
        console.log(`::notice::${result.reason}`);
    } else {
        console.log(`Grok auth OK — ${result.reason}`);
    }

    if (optionalEnv("SYNC_AUTH_SECRET") === "true" && result.refreshed) {
        syncRefreshedAuthToSecret(authPath);
    }
};
