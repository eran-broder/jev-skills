import assert from "node:assert/strict";
import { test } from "node:test";
import { prefilter } from "../src/registry/prefilter";
import type { Skill } from "../src/registry/skill";

const skill = (name: string, description: string): Skill => ({ name, description, category: "t", path: `/${name}` });

const library = [
  skill("kafka-monitoring", "Use when the user asks to set up monitoring for kafka."),
  skill("redis-backup", "Use when the user asks to back up redis."),
  skill("cloudflare", "Use for Cloudflare Workers, KV, R2 and wrangler deployments."),
  skill("web-perf", "Audit page load performance and Core Web Vitals."),
];

test("ranks lexically matching skills first and keeps only the requested number", () => {
  const kept = prefilter(library, "deploy my worker to cloudflare with a KV namespace", 2);
  assert.equal(kept.length, 2);
  assert.equal(kept[0]?.name, "cloudflare");
});

test("returns the library untouched when it is already small enough", () => {
  assert.equal(prefilter(library, "anything", 10).length, library.length);
});

test("matches on hyphenated skill names as words", () => {
  const kept = prefilter(library, "monitoring for kafka", 1);
  assert.equal(kept[0]?.name, "kafka-monitoring");
});
