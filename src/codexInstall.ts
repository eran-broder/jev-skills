import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { z } from "zod";
import { HookEvent } from "./hooks/input";
import { codexHooksFile, pluginRoot } from "./paths";

const MARKER = "jev-skills";
const TIMEOUT_SECONDS: Record<HookEvent, number> = {
  [HookEvent.UserPromptSubmit]: 15,
  [HookEvent.PostToolUse]: 15,
  [HookEvent.SessionStart]: 5,
  [HookEvent.PostCompact]: 5,
};
const CONTEXT_EVENTS = new Set<HookEvent>([HookEvent.UserPromptSubmit, HookEvent.PostToolUse]);
const TOOL_MATCHER = "Read|Bash|Grep|Glob|WebFetch|WebSearch|shell|read_file|grep|glob";

const HooksFileSchema = z.object({ hooks: z.record(z.string(), z.unknown().array()).default({}) }).passthrough();

type HooksFile = z.infer<typeof HooksFileSchema>;

const hookCommand = () => `node "${join(pluginRoot(), "dist", "hook.js").replace(/\\/g, "/")}"`;

const handler = (event: HookEvent) => ({
  type: "command",
  command: hookCommand(),
  commandWindows: hookCommand(),
  timeout: TIMEOUT_SECONDS[event],
  statusMessage: `${MARKER}: asking Jev which skills matter`,
  ...(CONTEXT_EVENTS.has(event) ? { additionalContextLimit: 0 } : {}),
});

const group = (event: HookEvent, matcher?: string) => ({ ...(matcher ? { matcher } : {}), [MARKER]: true, hooks: [handler(event)] });

const isOurs = (entry: unknown) => typeof entry === "object" && entry !== null && MARKER in entry;

const readHooksFile = (): HooksFile =>
  existsSync(codexHooksFile()) ? HooksFileSchema.parse(JSON.parse(readFileSync(codexHooksFile(), "utf8"))) : { hooks: {} };

const withoutOurs = (file: HooksFile): HooksFile => ({
  ...file,
  hooks: Object.fromEntries(Object.entries(file.hooks).map(([event, groups]) => [event, groups.filter((g) => !isOurs(g))])),
});

const withOurs = (file: HooksFile): HooksFile => {
  const additions: Record<HookEvent, ReturnType<typeof group>> = {
    [HookEvent.UserPromptSubmit]: group(HookEvent.UserPromptSubmit),
    [HookEvent.PostToolUse]: group(HookEvent.PostToolUse, TOOL_MATCHER),
    [HookEvent.SessionStart]: group(HookEvent.SessionStart),
    [HookEvent.PostCompact]: group(HookEvent.PostCompact),
  };
  const hooks = { ...file.hooks };
  for (const [event, addition] of Object.entries(additions)) hooks[event] = [...(hooks[event] ?? []), addition];
  return { ...file, hooks };
};

const write = (file: HooksFile) => {
  mkdirSync(dirname(codexHooksFile()), { recursive: true });
  writeFileSync(codexHooksFile(), JSON.stringify(file, null, 2));
  return codexHooksFile();
};

export const installCodexHooks = () => write(withOurs(withoutOurs(readHooksFile())));

export const uninstallCodexHooks = () => (existsSync(codexHooksFile()) ? write(withoutOurs(readHooksFile())) : codexHooksFile());
