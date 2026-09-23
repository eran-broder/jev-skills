import assert from "node:assert/strict";
import { test } from "node:test";
import type { JevClient } from "../src/jev/client";
import { chunkQuestions, fanout, StateTooLargeError, type Question } from "../src/jev/fanout";

const question = (id: string, size = 40): Question => ({ id, noul: { type: "noul", instructions: "x".repeat(size) } });

test("chunks questions so each request stays under the token budget", () => {
  const questions = Array.from({ length: 100 }, (_, i) => question(`q${i}`, 350));
  const chunks = chunkQuestions({ request: "hello" }, questions, 1_000);
  assert.ok(chunks.length > 1);
  assert.equal(chunks.flat().length, 100);
  for (const chunk of chunks) assert.ok(chunk.length <= 10);
});

test("rejects a state that alone exceeds Jev's state limit", () => {
  assert.throws(() => chunkQuestions({ request: "x".repeat(200_000) }, [question("q")], 48_000), StateTooLargeError);
});

test("fanout merges answers from every chunk and respects concurrency", async () => {
  let inFlight = 0;
  let peak = 0;
  const client: JevClient = async (request) => {
    inFlight++;
    peak = Math.max(peak, inFlight);
    await new Promise((resolve) => setTimeout(resolve, 5));
    inFlight--;
    return {
      model: "jev-test",
      answers: Object.fromEntries(Object.keys(request.questions).map((id) => [id, { type: "noul" as const, noul: 0.5 }])),
      usage: { input_tokens: 1, output_tokens: 1 },
    };
  };
  const questions = Array.from({ length: 60 }, (_, i) => question(`q${i}`, 350));
  const result = await fanout(client, { request: "hi" }, questions, { model: "jev-test", requestTokenBudget: 1_000, concurrency: 2 });
  assert.equal(result.verdicts.size, 60);
  assert.ok(result.requests > 1);
  assert.ok(peak <= 2);
});
