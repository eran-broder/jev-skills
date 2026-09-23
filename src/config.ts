import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { z } from "zod";
import { QuestionStyle } from "./jev/questions";
import { dataHome, pluginRoot } from "./paths";

export enum InjectMode {
  Full = "full",
  Pointer = "pointer",
}

export const ConfigSchema = z.object({
  apiKey: z.string().min(1).optional(),
  model: z.string().default("jev-latest"),
  libraries: z.string().array().default([]),
  threshold: z.number().min(0).max(1).default(0.6),
  maxSkillsPerTurn: z.number().int().positive().default(3),
  injectMode: z.enum(InjectMode).default(InjectMode.Full),
  injectBudgetChars: z.number().int().positive().default(24_000),
  stateBudgetChars: z.number().int().positive().default(6_000),
  requestTokenBudget: z.number().int().positive().default(48_000),
  concurrency: z.number().int().positive().default(6),
  timeoutMs: z.number().int().positive().default(6_000),
  observeToolResults: z.boolean().default(true),
  toolResultMinChars: z.number().int().nonnegative().default(200),
  questionStyle: z.enum(QuestionStyle).default(QuestionStyle.Full),
  prefilterAbove: z.number().int().positive().default(1_200),
  prefilterKeep: z.number().int().positive().default(400),
});

export type Config = z.infer<typeof ConfigSchema>;

const API_KEY_ENV = ["CLAUDE_PLUGIN_OPTION_TYPESAFE_API_KEY", "TYPESAFE_API_KEY"] as const;

export const configFile = () => join(dataHome(), "config.json");

export const defaultLibraries = () => [join(pluginRoot(), "library"), join(dataHome(), "library")];

const readJson = (path: string): unknown => (existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : {});

const envApiKey = () => API_KEY_ENV.map((name) => process.env[name]).find((value) => value && value.length > 0);

const withEnvOverrides = (config: Config): Config => ({ ...config, apiKey: envApiKey() ?? config.apiKey });

const withDefaultLibraries = (config: Config): Config =>
  config.libraries.length > 0 ? config : { ...config, libraries: defaultLibraries() };

export const loadConfig = (): Config => withDefaultLibraries(withEnvOverrides(ConfigSchema.parse(readJson(configFile()))));

export const saveConfig = (patch: Partial<Config>) => {
  const merged = ConfigSchema.parse({ ...readJson(configFile()) as object, ...patch });
  mkdirSync(dirname(configFile()), { recursive: true });
  writeFileSync(configFile(), JSON.stringify(merged, null, 2));
  return merged;
};

export class MissingApiKeyError extends Error {
  constructor() {
    super(`No TypeSafe API key. Provide it as plugin config typesafe_api_key, env TYPESAFE_API_KEY, or run: jev-skills setup <key>`);
  }
}

export const requireApiKey = (config: Config): string => {
  if (!config.apiKey) throw new MissingApiKeyError();
  return config.apiKey;
};
