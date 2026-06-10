import { appendFileSync } from "node:fs";

export const setOutput = (name: string, value: string | number) => {
    const outputFile = process.env.GITHUB_OUTPUT;
    if (!outputFile) return;
    appendFileSync(outputFile, `${name}=${value}\n`);
};
