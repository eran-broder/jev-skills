import { existsSync, readdirSync, readFileSync, renameSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { installCodexHooks, uninstallCodexHooks } from "./codexInstall";
import { configFile, loadConfig, saveConfig } from "./config";
import { Trigger } from "./jev/questions";
import { detectAgent, dataHome, legacySkillsDir } from "./paths";
import { observe } from "./observer/observe";
import { scanLibraries } from "./registry/scan";

enum Command {
  Setup = "setup",
  List = "list",
  Ask = "ask",
  Status = "status",
  Migrate = "migrate",
  InstallCodex = "install-codex",
  UninstallCodex = "uninstall-codex",
}

const usage = `jev-skills <command>
  setup <api-key>       store the TypeSafe API key in ${configFile()}
  list                  list skills the observer can see
  ask <prompt...>       run the observer on a prompt and print its decisions
  status [n]            show the last n observer log entries (default 10)
  migrate [--apply]     move ~/.claude/skills (or ~/.codex/skills) into the observer library
  install-codex         register the observer in ~/.codex/hooks.json
  uninstall-codex       remove the observer from ~/.codex/hooks.json`;

const setup = ([apiKey]: string[]) => {
  if (!apiKey) throw new Error("setup needs an API key");
  saveConfig({ apiKey });
  console.log(`Saved API key to ${configFile()}`);
};

const list = () => {
  const config = loadConfig();
  const skills = scanLibraries(config.libraries);
  console.log(`Libraries: ${config.libraries.join(", ")}`);
  for (const skill of skills) console.log(`${skill.name.padEnd(32)} [${skill.category}]  ${skill.description.slice(0, 90)}`);
  console.log(`${skills.length} skills`);
};

const ask = async (words: string[]) => {
  const request = words.join(" ");
  if (!request) throw new Error("ask needs a prompt");
  const observation = await observe({ request, recent_conversation: [] }, Trigger.Prompt, `cli-${Date.now()}`, loadConfig());
  const { library, candidates, aboveThreshold, requests, jevInputTokens, elapsedMs } = observation;
  console.log(`library=${library} candidates=${candidates} above-threshold=${aboveThreshold} requests=${requests} jev-input-tokens=${jevInputTokens} elapsed=${elapsedMs.toFixed(0)}ms`);
  for (const { skill, probability } of observation.selected) console.log(`${probability.toFixed(2)}  ${skill.name}`);
  if (observation.selected.length === 0) console.log("no skill above threshold");
};

const status = ([count]: string[]) => {
  const file = join(dataHome(), "log.jsonl");
  if (!existsSync(file)) return console.log("no log yet");
  const lines = readFileSync(file, "utf8").trim().split("\n");
  console.log(lines.slice(-(Number(count) || 10)).join("\n"));
};

const migrate = (flags: string[]) => {
  const source = legacySkillsDir(detectAgent());
  const target = join(dataHome(), "library");
  const apply = flags.includes("--apply");
  if (!existsSync(source)) return console.log(`nothing to migrate at ${source}`);
  mkdirSync(target, { recursive: true });
  for (const entry of readdirSync(source, { withFileTypes: true })) {
    if (!entry.isDirectory() || !existsSync(join(source, entry.name, "SKILL.md"))) continue;
    console.log(`${apply ? "moving" : "would move"} ${entry.name} -> ${target}`);
    if (apply) renameSync(join(source, entry.name), join(target, entry.name));
  }
  if (!apply) console.log("dry run; add --apply to move");
};

const commands: Record<Command, (args: string[]) => void | Promise<void>> = {
  [Command.Setup]: setup,
  [Command.List]: list,
  [Command.Ask]: ask,
  [Command.Status]: status,
  [Command.Migrate]: migrate,
  [Command.InstallCodex]: () => console.log(`Registered observer hooks in ${installCodexHooks()}`),
  [Command.UninstallCodex]: () => console.log(`Removed observer hooks from ${uninstallCodexHooks()}`),
};

const [command, ...args] = process.argv.slice(2);
const handler = commands[command as Command];
if (!handler) {
  console.log(usage);
  process.exit(1);
}
await handler(args);
