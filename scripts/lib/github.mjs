import process from "node:process";

export const ghApi = async (method, apiPath, payload = null) => {
  const resp = await fetch(`https://api.github.com${apiPath}`, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.GH_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(payload !== null ? { "Content-Type": "application/json" } : {}),
    },
    body: payload !== null ? JSON.stringify(payload) : undefined,
  });
  const text = await resp.text();

  if (!resp.ok) return [resp.status, { _error: text }];

  return [resp.status, text ? JSON.parse(text) : {}];
}
