import { cmdFinish } from "./commands/finish.ts";
import { cmdPrompt } from "./commands/prompt.ts";
import { cmdStart } from "./commands/start.ts";

const commands: Record<string, (() => void | Promise<void>) | undefined> = {
  start: cmdStart,
  prompt: cmdPrompt,
  finish: cmdFinish,
};

const name = process.argv[2] ?? "";
const command = commands[name];

if (!command) {
  console.log(`Unknown subcommand '${name}' (expected start | prompt | finish)`);
  process.exit(2);
}

try {
  await command();
} catch (error) {
  const detail = error instanceof Error ? (error.stack ?? error.message) : String(error);
  console.log(`::error::${name} failed: ${detail}`);
  process.exit(1);
}
