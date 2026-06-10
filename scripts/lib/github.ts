export type GhResult<T> =
    | { ok: true; status: number; data: T }
    | { ok: false; status: number; error: string };

export const ghApi = async <T>(
    method: "GET" | "POST" | "PATCH",
    apiPath: string,
    body?: unknown,
): Promise<GhResult<T>> => {
    const response = await fetch(`https://api.github.com${apiPath}`, {
        method,
        headers: {
            Authorization: `Bearer ${process.env.GH_TOKEN}`,
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    const text = await response.text();
    if (!response.ok) return { ok: false, status: response.status, error: text };
    return { ok: true, status: response.status, data: (text ? JSON.parse(text) : {}) as T };
};
