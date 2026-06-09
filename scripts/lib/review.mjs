
import { stripPrefix } from "./env.mjs";
import { SEVERITY_EMOJI, VALID_SEVERITIES } from "./messages.mjs";

const BLOCK_RE = /<<<GROK_REVIEW>>>\s*(\{[\s\S]*?\})\s*<<<END_GROK_REVIEW>>>/g;

export const extractReview = (text) => {
  const matches = [...(text || "").matchAll(BLOCK_RE)];
  if (matches.length === 0) return null;
  try {
    return JSON.parse(matches[matches.length - 1][1]);
  } catch {
    return null;
  }
}

export const normalizeIssues = (rawIssues) => {
  const issues = [];
  for (const it of rawIssues || []) {
    if (typeof it !== "object" || it === null) continue;
    let file = String(it.file ?? "").trim();
    file = stripPrefix(stripPrefix(stripPrefix(file, "./"), "a/"), "b/");
    const lineNum = parseInt(it.line, 10);
    const line = Number.isNaN(lineNum) ? null : lineNum;
    let sev = String(it.severity ?? "warning").toLowerCase();
    if (!VALID_SEVERITIES.includes(sev)) sev = "warning";
    const title = String(it.title ?? "").trim();
    const body = String(it.body ?? "").trim();
    if (!file || !(title || body)) continue;
    issues.push({
      file,
      line,
      severity: sev,
      title: title || body.slice(0, 80),
      body,
      suggestion: String(it.suggestion ?? "").trim(),
    });
  }
  return issues;
}

export const issueMd = (it, withLocation = false) => {
  const emoji = SEVERITY_EMOJI[it.severity];
  const loc = withLocation ? ` — \`${it.file}:${it.line}\`` : "";
  let md = `${emoji} **[${it.severity}] ${it.title}**${loc}\n\n${it.body}`;
  if (it.suggestion) md += `\n\n**Suggestion:** ${it.suggestion}`;
  return md;
}
