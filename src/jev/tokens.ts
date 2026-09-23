const CHARS_PER_TOKEN = 3.5;

export const estimateTokens = (value: unknown) => Math.ceil(JSON.stringify(value).length / CHARS_PER_TOKEN);

export const JEV_LIMITS = {
  requestTokens: 64_000,
  stateWithLongestQuestionTokens: 32_000,
} as const;
