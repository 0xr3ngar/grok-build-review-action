const SHORT_SHA_LENGTH = 7;

export const shortSha = (sha: string) => sha.slice(0, SHORT_SHA_LENGTH);
