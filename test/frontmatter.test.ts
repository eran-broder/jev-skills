import assert from "node:assert/strict";
import { test } from "node:test";
import { splitFrontmatter } from "../src/registry/frontmatter";

test("parses simple key-value frontmatter and returns the body", () => {
  const { fields, body } = splitFrontmatter("---\nname: demo\ndescription: Use when demoing.\n---\n\n# Demo\n");
  assert.equal(fields["name"], "demo");
  assert.equal(fields["description"], "Use when demoing.");
  assert.equal(body.trim(), "# Demo");
});

test("joins folded multi-line descriptions", () => {
  const { fields } = splitFrontmatter("---\ndescription: >\n  first part\n  second part\n---\nbody");
  assert.equal(fields["description"], "first part second part");
});

test("strips surrounding quotes", () => {
  const { fields } = splitFrontmatter('---\ndescription: "quoted text"\n---\n');
  assert.equal(fields["description"], "quoted text");
});

test("returns whole source as body when there is no frontmatter", () => {
  const { fields, body } = splitFrontmatter("just text");
  assert.deepEqual(fields, {});
  assert.equal(body, "just text");
});
