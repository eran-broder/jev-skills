import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { lastHumanPrompt, recentTurns } from "../src/observer/transcript";

const line = (value: unknown) => JSON.stringify(value);

const transcript = () => {
  const file = join(mkdtempSync(join(tmpdir(), "jev-transcript-")), "t.jsonl");
  writeFileSync(
    file,
    [
      line({ type: "user", message: { content: "first question" } }),
      line({ type: "assistant", message: { content: [{ type: "text", text: "I will read it" }, { type: "tool_use", name: "Read", input: {} }] } }),
      line({ type: "user", message: { content: [{ type: "tool_result", tool_use_id: "x", content: "file body" }] } }),
      line({ type: "user", isMeta: true, message: { content: [{ type: "text", text: "system reminder" }] } }),
      line({ type: "user", message: { content: "second question" } }),
      line({ type: "assistant", message: { content: [{ type: "text", text: "answer" }] } }),
      "not json",
    ].join("\n"),
  );
  return file;
};

test("lastHumanPrompt skips tool results and meta entries", () => {
  assert.equal(lastHumanPrompt(transcript()), "second question");
});

test("recentTurns returns assistant text and tool names, newest last", () => {
  const turns = recentTurns(transcript(), 5);
  assert.deepEqual(turns, [
    { assistant: "I will read it", tools: ["Read"] },
    { assistant: "answer", tools: [] },
  ]);
});

test("missing transcript yields empty results", () => {
  assert.deepEqual(recentTurns(undefined, 3), []);
  assert.equal(lastHumanPrompt("/nowhere/none.jsonl"), "");
});
