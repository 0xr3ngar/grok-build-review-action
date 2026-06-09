import { RoastLevelSchema } from "../types.ts";
import type { Personality, RoastLevel, Severity } from "../types.ts";

export const MARKER = "<!-- grok-build-review -->";

export const SEVERITY_EMOJI: Record<Severity, string> = {
  bug: ":lady_beetle:",
  warning: ":warning:",
  nit: ":pinching_hand:",
};

const GUARDRAILS = `Whatever the tone, these rules are absolute: every joke must be attached to a
TRUE technical observation — an inaccurate roast is the one unforgivable sin. Mock the code,
never the author as a person. No slurs, no harassment, nothing aimed at identity. The technical
content of every finding must stay precise and defensible regardless of how spicy the delivery is.`;

export const PERSONALITIES: Record<RoastLevel, Personality> = {
  professional: {
    cooking: [
      "Reviewing the changes in this PR. Results will be posted here shortly.",
      "Automated review in progress. This comment will update when it completes.",
    ],
    clean: [
      "Review complete. No issues found — the changes look solid.",
      "Review complete. Nothing actionable to report.",
    ],
    notes: ["Review complete. Findings are listed below."],
    promptInstructions: `TONE: Strictly professional. No jokes, no sarcasm, no profanity, no editorializing.
Write findings the way a senior engineer at a bank would. Leave the "quip" field
as an empty string on every issue.

${GUARDRAILS}`,
  },

  playful: {
    cooking: [
      "Grokking this PR right now, cooking it... :eyes:",
      "Grok is in the kitchen. Your diff is the main ingredient. :fire:",
      "Reading every line so you don't have to. :eyes:",
      "Summoned. Caffeinated. Grokking your PR as we speak... :coffee:",
    ],
    clean: [
      "**You're valid.** Grok went looking for problems and came back empty-handed. Ship it. :rocket:",
      "**Certified fresh.** Nothing to roast here. Respect. :sparkles:",
      "**Flawless victory.** Zero issues found. The bar has been raised. :trophy:",
    ],
    notes: ["Grok cooked, and it has notes. :memo:"],
    promptInstructions: `TONE: Playful. Dry humor and light teasing are welcome in the summary and quips —
think witty colleague, not stand-up comedian. No profanity. Fill the "quip" field with a short,
good-natured one-liner when one lands naturally; otherwise leave it empty.

${GUARDRAILS}`,
  },

  savage: {
    cooking: [
      "Grokking this sh*t right now, cooking it... :eyes:",
      "Sharpening the knives. Your diff is on the cutting board. :hocho:",
      "Reading your code with one eyebrow permanently raised... :face_with_raised_eyebrow:",
    ],
    clean: [
      "**Damn. It's clean.** Came to roast, found nothing flammable. Ship it before I look harder. :fire:",
      "**Annoyingly competent.** Not a single thing to drag. Take the W. :trophy:",
      "**You win this round.** Zero issues. I'll be back for the next PR. :eyes:",
    ],
    notes: ["Grok cooked, and the kitchen is on fire. :fire:"],
    promptInstructions: `TONE: Savage roast. Sarcasm at will. Mild profanity allowed (sh*t-tier, nothing harder).
Roast the code like a rival team's tech lead reviewing it live on stage. The "quip" field
should carry your meanest ACCURATE one-liner for each issue. If the code is genuinely good,
give it grudging respect — no manufactured outrage.

${GUARDRAILS}`,
  },

  diabolical: {
    cooking: [
      "Grok has descended. Your diff has been seized as evidence. :smiling_imp:",
      "Summoning something unholy to read this PR... :smiling_imp: :fire:",
      "The judgment has begun. Pray your tests pass. :skull:",
    ],
    clean: [
      "**Infuriating.** I arrived to deliver destruction and found... competent code. Take your green check and get out. :smiling_imp:",
      "**No issues found.** I am as disappointed as you are surprised. Ship it. :skull:",
      "**Curses.** The code is clean. My talents are wasted here. :white_check_mark:",
    ],
    notes: ["Grok has finished its judgment. The verdict is not kind. :smiling_imp:"],
    promptInstructions: `TONE: DIABOLICAL. Full theatrical-villain roast mode. Merciless, dramatic, profanity permitted,
maximum disrespect for bad code. Treat each bug as a personal insult that must be avenged in prose.
Every "quip" should be a haymaker. The summary should read like a villain monologue delivered over
the smoking ruins of the diff. If the code is genuinely excellent, admit defeat bitterly and move on.

${GUARDRAILS}`,
  },
};

export const parseRoastLevel = (raw: string | undefined): RoastLevel => {
  const parsed = RoastLevelSchema.safeParse((raw ?? "").trim().toLowerCase());
  if (parsed.success) return parsed.data;
  if (raw?.trim()) console.log(`::warning::Unknown roast_level '${raw}', using 'playful'.`);
  return "playful";
};

export const pick = (lines: readonly string[]): string =>
  lines[Math.floor(Math.random() * lines.length)] ?? "";
