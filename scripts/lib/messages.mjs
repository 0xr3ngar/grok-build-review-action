export const MARKER = "<!-- grok-build-review -->";

export const COOKING_LINES = [
  "Grokking this sh*t right now, cooking it... :eyes:",
  "Grok is in the kitchen. Your diff is the ingredient. :cook:",
  "Reading every line so you don't have to. Cooking... :fire:",
  "Summoned. Caffeinated. Grokking your PR as we speak... :eyes:",
];

export const CLEAN_LINES = [
  "**You're valid.** Grok went looking for problems and came back empty-handed. Ship it. :rocket:",
  "**Certified clean.** Not a single thing to roast. Respect. :saluting_face:",
  "**Flawless victory.** Zero issues found. The bar has been raised. :trophy:",
  "**Nothing to see here.** Grok tried its hardest to complain and failed. :sparkles:",
];

export const SEVERITY_EMOJI = {
  bug: ":lady_beetle:",
  warning: ":warning:",
  nit: ":pinching_hand:",
};

export const VALID_SEVERITIES = ["bug", "warning", "nit"];

export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
