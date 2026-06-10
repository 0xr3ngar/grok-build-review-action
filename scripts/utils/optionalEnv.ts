export const optionalEnv = (name: string, fallback = "") => process.env[name] ?? fallback;
