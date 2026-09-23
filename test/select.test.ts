import assert from "node:assert/strict";
import { test } from "node:test";
import { selectSkills } from "../src/observer/select";
import type { Skill } from "../src/registry/skill";

const skill = (name: string): Skill => ({ name, description: name, category: "t", path: `/${name}` });

test("keeps skills above threshold, ordered by probability, capped by limit", () => {
  const skills = [skill("a"), skill("b"), skill("c"), skill("d")];
  const verdicts = new Map([["a", 0.9], ["b", 0.3], ["c", 0.95], ["d", 0.7]]);
  const selected = selectSkills(skills, verdicts, 0.6, 2, new Set());
  assert.deepEqual(selected.map((s) => s.skill.name), ["c", "a"]);
});

test("excludes skills already injected in the session", () => {
  const selected = selectSkills([skill("a"), skill("b")], new Map([["a", 0.9], ["b", 0.9]]), 0.6, 5, new Set(["a"]));
  assert.deepEqual(selected.map((s) => s.skill.name), ["b"]);
});

test("treats a skill without a verdict as zero", () => {
  assert.deepEqual(selectSkills([skill("a")], new Map(), 0.1, 5, new Set()), []);
});
