import type { JevClient, Noul, SystemOneResponse } from "./client";
import { estimateTokens, JEV_LIMITS } from "./tokens";

export type Question = { id: string; noul: Noul };

export type FanoutOptions = {
  model: string;
  requestTokenBudget: number;
  concurrency: number;
};

export type Verdicts = Map<string, number>;

export type FanoutResult = { verdicts: Verdicts; requests: number; inputTokens: number };

export class StateTooLargeError extends Error {
  constructor(tokens: number) {
    super(`State is ~${tokens} tokens; Jev allows ${JEV_LIMITS.stateWithLongestQuestionTokens} for state plus the longest question`);
  }
}

export const chunkQuestions = (state: unknown, questions: Question[], budget: number): Question[][] => {
  const stateTokens = estimateTokens(state);
  if (stateTokens >= JEV_LIMITS.stateWithLongestQuestionTokens) throw new StateTooLargeError(stateTokens);
  const chunks: Question[][] = [];
  let current: Question[] = [];
  let used = stateTokens;
  for (const question of questions) {
    const cost = estimateTokens(question.noul);
    if (current.length > 0 && used + cost > budget) {
      chunks.push(current);
      current = [];
      used = stateTokens;
    }
    current.push(question);
    used += cost;
  }
  if (current.length > 0) chunks.push(current);
  return chunks;
};

const runLimited = async <T>(tasks: (() => Promise<T>)[], limit: number): Promise<T[]> => {
  const results: T[] = new Array(tasks.length);
  let next = 0;
  const worker = async () => {
    for (let i = next++; i < tasks.length; i = next++) results[i] = await tasks[i]!();
  };
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
  return results;
};

const toQuestionMap = (chunk: Question[]) => Object.fromEntries(chunk.map((q) => [q.id, q.noul]));

const collect = (responses: SystemOneResponse[]): FanoutResult => ({
  verdicts: new Map(responses.flatMap((r) => Object.entries(r.answers).map(([id, answer]) => [id, answer.noul]))),
  requests: responses.length,
  inputTokens: responses.reduce((total, r) => total + r.usage.input_tokens, 0),
});

export const emptyResult = (): FanoutResult => ({ verdicts: new Map(), requests: 0, inputTokens: 0 });

export const fanout = async (client: JevClient, state: unknown, questions: Question[], options: FanoutOptions): Promise<FanoutResult> => {
  if (questions.length === 0) return emptyResult();
  const chunks = chunkQuestions(state, questions, Math.min(options.requestTokenBudget, JEV_LIMITS.requestTokens));
  const responses = await runLimited(
    chunks.map((chunk) => () => client({ state, model: options.model, questions: toQuestionMap(chunk) })),
    options.concurrency,
  );
  return collect(responses);
};
