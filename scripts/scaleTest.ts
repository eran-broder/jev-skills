import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { ConfigSchema, loadConfig } from "../src/config";
import { QuestionStyle, Trigger } from "../src/jev/questions";
import { observe } from "../src/observer/observe";
import { generateLibrary } from "./generateLibrary";

const PROMPTS = [
  "deploy my worker to cloudflare with a KV namespace",
  "set up monitoring for our kafka cluster",
  "tell me about pineapples",
  "write a python script that renames files",
];

const apiKey = () => ConfigSchema.parse(JSON.parse(readFileSync(join(homedir(), ".jev-skills", "config.json"), "utf8"))).apiKey;

const prepare = (size: number, questionStyle: QuestionStyle) => {
  const root = join(tmpdir(), `jev-scale-${size}`);
  rmSync(root, { recursive: true, force: true });
  mkdirSync(root, { recursive: true });
  const library = join(root, "library");
  if (size > 0) generateLibrary(library, size);
  const libraries = [library, join(homedir(), ".claude", "skills"), join(process.cwd(), "library")];
  writeFileSync(join(root, "config.json"), JSON.stringify({ apiKey: apiKey(), libraries, questionStyle }));
  process.env["JEV_SKILLS_HOME"] = root;
};

const run = async (size: number, questionStyle: QuestionStyle) => {
  prepare(size, questionStyle);
  const config = loadConfig();
  console.log(`\n===== synthetic=${size} questionStyle=${questionStyle} =====`);
  for (const request of PROMPTS) {
    const o = await observe({ request, recent_conversation: [] }, Trigger.Prompt, `scale-${Date.now()}`, config);
    const picks = o.selected.map((s) => `${s.skill.name}(${s.probability.toFixed(2)})`).join(", ") || "none";
    console.log(`${request.padEnd(52)} lib=${o.library} cand=${o.candidates} above=${o.aboveThreshold} req=${o.requests} tokens=${o.jevInputTokens} ${o.elapsedMs.toFixed(0)}ms -> ${picks}`);
  }
};

const [size, style] = process.argv.slice(2);
await run(Number(size ?? 600), style === QuestionStyle.Slim ? QuestionStyle.Slim : QuestionStyle.Full);
