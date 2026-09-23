import { z } from "zod";

const ENDPOINT = "https://api.typesafe.ai/v1/systemone";
const RETRYABLE = new Set([429, 529, 502, 503]);
const MAX_ATTEMPTS = 3;
const BACKOFF_MS = 300;

export type Noul = {
  type: "noul";
  instructions: unknown;
  criteria?: { true: string; false: string };
};

export type SystemOneRequest = {
  state: unknown;
  model: string;
  questions: Record<string, Noul>;
};

const NoulAnswer = z.object({ type: z.literal("noul"), noul: z.number().min(0).max(1) });

export const SystemOneResponseSchema = z.object({
  model: z.string(),
  answers: z.record(z.string(), NoulAnswer),
  usage: z.object({ input_tokens: z.number(), output_tokens: z.number() }),
});

export type SystemOneResponse = z.infer<typeof SystemOneResponseSchema>;

export class JevHttpError extends Error {
  constructor(
    readonly status: number,
    body: string,
  ) {
    super(`Jev responded ${status}: ${body.slice(0, 300)}`);
  }
}

export type JevClient = (request: SystemOneRequest) => Promise<SystemOneResponse>;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const retryDelay = (response: Response, attempt: number) => {
  const header = Number(response.headers.get("retry-after"));
  return Number.isFinite(header) && header > 0 ? header * 1000 : BACKOFF_MS * 2 ** attempt;
};

const post = async (apiKey: string, request: SystemOneRequest, timeoutMs: number) =>
  fetch(ENDPOINT, {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify(request),
    signal: AbortSignal.timeout(timeoutMs),
  });

export const createJevClient = (apiKey: string, timeoutMs: number): JevClient => async (request) => {
  for (let attempt = 0; ; attempt++) {
    const response = await post(apiKey, request, timeoutMs);
    const text = await response.text();
    if (response.ok) return SystemOneResponseSchema.parse(JSON.parse(text));
    if (!RETRYABLE.has(response.status) || attempt + 1 >= MAX_ATTEMPTS) throw new JevHttpError(response.status, text);
    await sleep(retryDelay(response, attempt));
  }
};
