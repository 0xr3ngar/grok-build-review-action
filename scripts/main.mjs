#!/usr/bin/env node
// Grok Build PR Review — entrypoint.
//
// Usage: node main.mjs <start | prompt | finish>
//   start   Upsert the sticky "Grokking..." status comment on the PR.
//   prompt  Build the review prompt from PR metadata + diff.
//   finish  Parse grok's output, post inline review comments, update status.

import process from "node:process";

import { cmdStart } from "./commands/start.mjs";
import { cmdPrompt } from "./commands/prompt.mjs";
import { cmdFinish } from "./commands/finish.mjs";

const cmd = process.argv[2] ?? "";
try {
  if (cmd === "start") await cmdStart();
  else if (cmd === "prompt") cmdPrompt();
  else if (cmd === "finish") await cmdFinish();
  else {
    console.log(`Unknown subcommand: '${cmd}' (expected start | prompt | finish)`);
    process.exit(2);
  }
} catch (err) {
  console.log(`::error::main.mjs ${cmd} failed: ${err?.stack ?? err}`);
  process.exit(1);
}
