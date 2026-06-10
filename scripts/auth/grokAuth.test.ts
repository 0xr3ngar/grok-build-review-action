import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
    parseGrokAuthObject,
    REFRESH_BUFFER_MS,
    refreshAuthFileIfNeeded,
    XAI_AUTH_KEY,
} from "./grokAuth.ts";

const sampleAuth = (expiresAt: string) => ({
    [XAI_AUTH_KEY]: {
        key: "access-old",
        refresh_token: "refresh-old",
        expires_at: expiresAt,
        email: "you@example.com",
    },
});

describe("parseGrokAuthObject", () => {
    test("reads tokens from auth.json shape", () => {
        const expiresAt = new Date(Date.now() + 60_000).toISOString();
        const tokens = parseGrokAuthObject(sampleAuth(expiresAt));
        expect(tokens?.accessToken).toBe("access-old");
        expect(tokens?.refreshToken).toBe("refresh-old");
        expect(tokens?.expiresAt).toBe(new Date(expiresAt).getTime());
    });

    test("returns null when refresh token is missing", () => {
        expect(
            parseGrokAuthObject({
                [XAI_AUTH_KEY]: { key: "only-access" },
            }),
        ).toBeNull();
    });
});

describe("refreshAuthFileIfNeeded", () => {
    const dirs: string[] = [];

    afterEach(() => {
        for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
    });

    const writeAuth = (expiresAt: string) => {
        const dir = mkdtempSync(join(tmpdir(), "grok-auth-"));
        dirs.push(dir);
        const authPath = join(dir, "auth.json");
        writeFileSync(authPath, JSON.stringify(sampleAuth(expiresAt), null, 2));
        return authPath;
    };

    test("skips refresh when access token is still valid", async () => {
        const authPath = writeAuth(new Date(Date.now() + REFRESH_BUFFER_MS + 60_000).toISOString());
        const result = await refreshAuthFileIfNeeded(authPath);
        expect(result.refreshed).toBe(false);
        expect(readFileSync(authPath, "utf8")).toContain("access-old");
    });

    test("refreshes and persists rotated tokens when access token is expired", async () => {
        const authPath = writeAuth(new Date(Date.now() - 60_000).toISOString());
        const originalFetch = globalThis.fetch;

        globalThis.fetch = (async () =>
            new Response(
                JSON.stringify({
                    access_token: "access-new",
                    refresh_token: "refresh-new",
                    expires_in: 3600,
                }),
                { status: 200, headers: { "Content-Type": "application/json" } },
            )) as unknown as typeof fetch;

        try {
            const result = await refreshAuthFileIfNeeded(authPath);
            expect(result.refreshed).toBe(true);

            const saved = JSON.parse(readFileSync(authPath, "utf8")) as Record<string, Record<string, string>>;
            expect(saved[XAI_AUTH_KEY]?.key).toBe("access-new");
            expect(saved[XAI_AUTH_KEY]?.refresh_token).toBe("refresh-new");
            expect(saved[XAI_AUTH_KEY]?.email).toBe("you@example.com");
        } finally {
            globalThis.fetch = originalFetch;
        }
    });
});
