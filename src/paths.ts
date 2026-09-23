import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export enum Agent {
  Claude = "claude",
  Codex = "codex",
}

const AGENT_HOME: Record<Agent, string> = {
  [Agent.Claude]: ".claude",
  [Agent.Codex]: ".codex",
};

export const detectAgent = (): Agent => (process.env["CODEX_HOME"] || process.env["CODEX_PLUGIN_ROOT"] ? Agent.Codex : Agent.Claude);

export const agentHome = (agent: Agent) =>
  (agent === Agent.Claude ? process.env["CLAUDE_CONFIG_DIR"] : process.env["CODEX_HOME"]) ?? join(homedir(), AGENT_HOME[agent]);

export const dataHome = () => process.env["JEV_SKILLS_HOME"] ?? join(homedir(), ".jev-skills");

export const legacySkillsDir = (agent: Agent) => join(agentHome(agent), "skills");

const bundleRoot = () => dirname(dirname(fileURLToPath(import.meta.url)));

export const pluginRoot = () => process.env["CLAUDE_PLUGIN_ROOT"] ?? process.env["PLUGIN_ROOT"] ?? bundleRoot();

export const codexHooksFile = () => join(agentHome(Agent.Codex), "hooks.json");
