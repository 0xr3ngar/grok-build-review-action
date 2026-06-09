import fs from "node:fs";
import path from "node:path";
import process from "node:process";

export const env = (name, fallback = undefined) => {
  const val = process.env[name] ?? fallback;
  if (val === undefined) {
    console.log(`::error::Missing required env var ${name}`);
    process.exit(2);
  }
  return val;
}

export const workPath = (...parts) => path.join(env("WORK"), ...parts);

export const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));

export const stripPrefix = (s, prefix) => (s.startsWith(prefix) ? s.slice(prefix.length) : s);

export const setOutput = (name, value) => {
  const out = process.env.GITHUB_OUTPUT;
  if (out) fs.appendFileSync(out, `${name}=${value}\n`);
}
