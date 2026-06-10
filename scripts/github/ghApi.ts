const GITHUB_API_BASE_URL = "https://api.github.com";
const GITHUB_API_VERSION = "2022-11-28";

export const ghApi = async <T>(
    method: "GET" | "POST" | "PATCH",
    apiPath: string,
    body?: unknown,
) => {
    const response = await fetch(`${GITHUB_API_BASE_URL}${apiPath}`, {
        method,
        headers: {
            Authorization: `Bearer ${process.env.GH_TOKEN}`,
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": GITHUB_API_VERSION,
            ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    const text = await response.text();
    if (!response.ok) return { ok: false as const, status: response.status, error: text };
    return {
        ok: true as const,
        status: response.status,
        data: (text ? JSON.parse(text) : {}) as T,
    };
};
