import path from "node:path";

import { requireEnv } from "./requireEnv.ts";

export const workPath = (file: string) => path.join(requireEnv("WORK"), file);
