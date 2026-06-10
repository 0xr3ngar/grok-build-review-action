import { readFileSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export const DEFAULT_AUTH_PATH = join(homedir(), ".grok", "auth.json");
export const XAI_AUTH_KEY = "https://auth.x.ai::b1a00492-073a-47ea-816f-4c329264a828";
export const TOKEN_ENDPOINT = "https://auth.x.ai/oauth2/token";
export const DEFAULT_CLIENT_ID = "b1a00492-073a-47ea-816f-4c329264a828";

/** Refresh when fewer than this many ms remain on the access token. */
export const REFRESH_BUFFER_MS = 5 * 60 * 1000;

export interface GrokAuthTokens {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
}

interface GrokAuthEntry {
    key: string;
    refresh_token: string;
    expires_at?: string;
    [extra: string]: unknown;
}

export type GrokAuthFile = Record<string, GrokAuthEntry>;

export const parseGrokAuthObject = (
    data: unknown,
    authKey: string = XAI_AUTH_KEY,
): GrokAuthTokens | null => {
    const entry = (data as GrokAuthFile | null)?.[authKey];
    if (!entry?.key || !entry?.refresh_token) return null;
    return {
        accessToken: entry.key,
        refreshToken: entry.refresh_token,
        expiresAt: entry.expires_at
            ? new Date(entry.expires_at).getTime()
            : Date.now() + 6 * 60 * 60 * 1000,
    };
};

export const readGrokAuthFile = (authPath: string = DEFAULT_AUTH_PATH): GrokAuthFile | null => {
    try {
        return JSON.parse(readFileSync(authPath, "utf8")) as GrokAuthFile;
    } catch {
        return null;
    }
};

const writeGrokAuthFile = (filePath: string, data: GrokAuthFile): void => {
    const tmp = `${filePath}.tmp-${process.pid}-${Date.now()}`;
    writeFileSync(tmp, JSON.stringify(data, null, 2), { encoding: "utf8", mode: 0o600 });
    renameSync(tmp, filePath);
};

export const refreshGrokToken = async (
    refreshToken: string,
    clientId: string = DEFAULT_CLIENT_ID,
): Promise<GrokAuthTokens | null> => {
    const res = await fetch(TOKEN_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: refreshToken,
            client_id: clientId,
        }),
    });

    if (!res.ok) {
        const body = await res.text();
        throw new Error(`OAuth refresh failed (${res.status}): ${body}`);
    }

    const data = (await res.json()) as {
        access_token: string;
        refresh_token?: string;
        expires_in?: number;
    };

    return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token ?? refreshToken,
        expiresAt: Date.now() + (data.expires_in ?? 21600) * 1000,
    };
};

const persistRefreshedTokens = (
    filePath: string,
    authKey: string,
    refreshed: GrokAuthTokens,
    current: GrokAuthFile,
): void => {
    const existing = current[authKey] ?? ({} as GrokAuthEntry);
    current[authKey] = {
        ...existing,
        key: refreshed.accessToken,
        refresh_token: refreshed.refreshToken,
        expires_at: new Date(refreshed.expiresAt).toISOString(),
    };
    writeGrokAuthFile(filePath, current);
};

export interface RefreshAuthResult {
    refreshed: boolean;
    authPath: string;
    reason: string;
}

/**
 * Refresh ~/.grok/auth.json when the access token is expired or near expiry.
 * OAuth refresh tokens rotate on use; persisting the new file keeps CI secrets in sync.
 */
export const refreshAuthFileIfNeeded = async (
    authPath: string = DEFAULT_AUTH_PATH,
    options: { force?: boolean; clientId?: string } = {},
): Promise<RefreshAuthResult> => {
    const authData = readGrokAuthFile(authPath);
    if (!authData) {
        throw new Error(`Could not read Grok auth file at ${authPath}`);
    }

    const tokens = parseGrokAuthObject(authData, XAI_AUTH_KEY);
    if (!tokens) {
        throw new Error(
            "auth.json is missing OAuth tokens. Re-run `grok login` and copy ~/.grok/auth.json into GROK_AUTH_JSON.",
        );
    }

    const needsRefresh =
        options.force === true || Date.now() + REFRESH_BUFFER_MS >= tokens.expiresAt;

    if (!needsRefresh) {
        return {
            refreshed: false,
            authPath,
            reason: "access token still valid",
        };
    }

    const refreshed = await refreshGrokToken(tokens.refreshToken, options.clientId);
    if (!refreshed) {
        throw new Error("OAuth refresh returned no tokens");
    }

    persistRefreshedTokens(authPath, XAI_AUTH_KEY, refreshed, authData);

    return {
        refreshed: true,
        authPath,
        reason: "access token refreshed via auth.x.ai",
    };
};
