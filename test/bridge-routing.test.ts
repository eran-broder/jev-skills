import { test } from "node:test";
import assert from "node:assert/strict";
import { createJevClient } from "../src/jev/client";
import { loadConfig, requireApiKey } from "../src/config";

test("bridge mode routes locally using the sentinel instead of a configured key", async () => {
  const originalFetch = globalThis.fetch;
  const previous = process.env.JEV_SKILLS_USE_BRIDGE;
  const previousKey = process.env.TYPESAFE_API_KEY;
  process.env.JEV_SKILLS_USE_BRIDGE = "1";
  process.env.TYPESAFE_API_KEY = "should-not-be-sent";
  let destination = "";
  let authorization = "";
  globalThis.fetch = (async (url, init) => {
    destination = String(url);
    authorization = new Headers(init?.headers).get("authorization") ?? "";
    return new Response(JSON.stringify({ model: "test", answers: {}, usage: {input_tokens: 0, output_tokens: 0} }), {status: 200});
  }) as typeof fetch;
  try {
    const key = requireApiKey(loadConfig());
    await createJevClient(key, 1000)({ state: {}, model: "test", questions: {} });
    assert.equal(destination, "http://127.0.0.1:4319/v1/systemone");
    assert.equal(authorization, "Bearer via-jev-bridge");
  } finally {
    globalThis.fetch = originalFetch;
    if (previous === undefined) delete process.env.JEV_SKILLS_USE_BRIDGE; else process.env.JEV_SKILLS_USE_BRIDGE = previous;
    if (previousKey === undefined) delete process.env.TYPESAFE_API_KEY; else process.env.TYPESAFE_API_KEY = previousKey;
  }
});
