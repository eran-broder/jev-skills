import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { ConfigSchema } from "../src/config";

enum AgentCli {
  Claude = "claude",
  Codex = "codex",
}

type Case = { name: string; prompt: string; expectToken: string | null; agents: AgentCli[]; maxTurns: number };

const NOTES_FILE = "NOTES.txt";

const CASES: Case[] = [
  { name: "prompt match", prompt: "tell me about pineapples", expectToken: "PINEAPPLE-PROTOCOL-ACTIVE", agents: [AgentCli.Claude, AgentCli.Codex], maxTurns: 1 },
  { name: "prompt no match", prompt: "write a sql query joining users and orders", expectToken: null, agents: [AgentCli.Claude, AgentCli.Codex], maxTurns: 1 },
  { name: "tool result match", prompt: `read ${NOTES_FILE} and tell me what this repo is about`, expectToken: "HARVEST-LEDGER-ACTIVE", agents: [AgentCli.Claude], maxTurns: 3 },
];

const CANARY_TOKENS = ["PINEAPPLE-PROTOCOL-ACTIVE", "HARVEST-LEDGER-ACTIVE", "Canary"];

const pluginRoot = process.cwd();
const fixturesLibrary = join(pluginRoot, "test", "fixtures", "library");
const codexExe = process.env["CODEX_EXE"] ?? "codex";

const apiKey = () => ConfigSchema.parse(JSON.parse(readFileSync(join(homedir(), ".jev-skills", "config.json"), "utf8"))).apiKey;

const isolatedHome = () => {
  const home = join(tmpdir(), "jev-e2e-home");
  rmSync(home, { recursive: true, force: true });
  mkdirSync(home, { recursive: true });
  writeFileSync(join(home, "config.json"), JSON.stringify({ apiKey: apiKey(), libraries: [fixturesLibrary] }));
  return home;
};

const workspace = () => {
  const dir = join(tmpdir(), "jev-e2e-workspace");
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, NOTES_FILE), "name: pineapple-farm\nnotes: this repo tracks pineapple harvests by season\n");
  return dir;
};

class AgentRunError extends Error {
  constructor(agent: AgentCli, status: number | null, stderr: string) {
    super(`${agent} exited with ${status}: ${stderr.slice(0, 400)}`);
  }
}

const run = (agent: AgentCli, command: string, args: string[], env: NodeJS.ProcessEnv, cwd: string, shell: boolean) => {
  const result = spawnSync(command, args, { encoding: "utf8", env, cwd, shell, timeout: 300_000 });
  if (result.status !== 0) throw new AgentRunError(agent, result.status, result.stderr ?? "");
  return result.stdout ?? "";
};

const claudeAnswer = (testCase: Case, env: NodeJS.ProcessEnv, cwd: string) => {
  const args = ["-p", JSON.stringify(testCase.prompt), "--plugin-dir", pluginRoot, "--model", "claude-haiku-4-5", "--max-turns", String(testCase.maxTurns), "--allowedTools", "Read", "--output-format", "json"];
  return String(JSON.parse(run(AgentCli.Claude, "claude", args, env, cwd, true)).result ?? "");
};

const codexAnswer = (testCase: Case, env: NodeJS.ProcessEnv, cwd: string) => {
  const last = join(tmpdir(), "jev-e2e-codex-last.txt");
  rmSync(last, { force: true });
  const args = ["exec", "--skip-git-repo-check", "--dangerously-bypass-hook-trust", "--ephemeral", "-s", "read-only", "-c", "model_reasoning_effort=low", "-o", last, testCase.prompt];
  run(AgentCli.Codex, codexExe, args, env, cwd, false);
  return readFileSync(last, "utf8");
};

const answerers: Record<AgentCli, (testCase: Case, env: NodeJS.ProcessEnv, cwd: string) => string> = {
  [AgentCli.Claude]: claudeAnswer,
  [AgentCli.Codex]: codexAnswer,
};

const verdict = (answer: string, expectToken: string | null) => {
  const found = CANARY_TOKENS.filter((token) => answer.includes(token));
  return { pass: expectToken ? found.includes(expectToken) : found.length === 0, found };
};

const runCase = (testCase: Case, agent: AgentCli, env: NodeJS.ProcessEnv, cwd: string) => {
  const { pass, found } = verdict(answerers[agent](testCase, env, cwd), testCase.expectToken);
  console.log(`${pass ? "PASS" : "FAIL"}  ${agent.padEnd(6)} ${testCase.name.padEnd(18)} expect=${testCase.expectToken ?? "none"} found=[${found.join(",")}]`);
  return pass ? 0 : 1;
};

const only = process.argv[2] as AgentCli | undefined;
const env = { ...process.env, JEV_SKILLS_HOME: isolatedHome() };
const cwd = workspace();
const failures = CASES.flatMap((testCase) => testCase.agents.filter((agent) => !only || agent === only).map((agent) => runCase(testCase, agent, env, cwd))).reduce((a, b) => a + b, 0);
console.log(failures === 0 ? "all end-to-end cases passed" : `${failures} end-to-end case(s) failed`);
process.exit(failures === 0 ? 0 : 1);
