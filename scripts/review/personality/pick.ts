export const pick = (lines: readonly string[]) =>
    lines[Math.floor(Math.random() * lines.length)] ?? "";
