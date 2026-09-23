import { loadConfig, type Config } from "./config";
import { HookEvent, HookInputSchema, readStdin, type HookInput, type PostToolUse, type UserPromptSubmit } from "./hooks/input";
import { contextOutput, emit, type HookOutput } from "./hooks/output";
import { Trigger } from "./jev/questions";
import { describeError, log, LogLevel } from "./log";
import { renderContext, renderNotice } from "./observer/inject";
import { observe } from "./observer/observe";
import { forgetSession, pruneStaleSessions, rememberInjected } from "./observer/session";
import { promptState, toolState, type ObserverState } from "./observer/state";

enum SessionSource {
  Startup = "startup",
  Compact = "compact",
}

const TRIGGER: Record<HookEvent.UserPromptSubmit | HookEvent.PostToolUse, Trigger> = {
  [HookEvent.UserPromptSubmit]: Trigger.Prompt,
  [HookEvent.PostToolUse]: Trigger.ToolResult,
};

const respond = async (event: keyof typeof TRIGGER, state: ObserverState, sessionId: string, config: Config): Promise<HookOutput | null> => {
  const observation = await observe(state, TRIGGER[event], sessionId, config);
  log(LogLevel.Info, "observed", { event, sessionId, ...observation, selected: observation.selected.map((s) => [s.skill.name, s.probability]) });
  if (observation.selected.length === 0) return null;
  rememberInjected(sessionId, observation.selected.map((s) => s.skill.name));
  return contextOutput(event, renderContext(observation.selected, config.injectMode, config.injectBudgetChars), renderNotice(observation.selected));
};

const onPrompt = (input: UserPromptSubmit, config: Config) =>
  input.prompt.trim().length === 0 ? Promise.resolve(null) : respond(HookEvent.UserPromptSubmit, promptState(input, config.stateBudgetChars), input.session_id, config);

const toolOutputLength = (input: PostToolUse) =>
  typeof input.tool_response === "string" ? input.tool_response.length : JSON.stringify(input.tool_response ?? "").length;

const onToolResult = (input: PostToolUse, config: Config) =>
  !config.observeToolResults || toolOutputLength(input) < config.toolResultMinChars
    ? Promise.resolve(null)
    : respond(HookEvent.PostToolUse, toolState(input, config.stateBudgetChars), input.session_id, config);

const onSessionStart = (source: string | undefined, sessionId: string) => {
  if (source === SessionSource.Startup) pruneStaleSessions();
  if (source === SessionSource.Compact) forgetSession(sessionId);
  return Promise.resolve(null);
};

const dispatch = (input: HookInput, config: Config): Promise<HookOutput | null> => {
  switch (input.hook_event_name) {
    case HookEvent.UserPromptSubmit:
      return onPrompt(input, config);
    case HookEvent.PostToolUse:
      return onToolResult(input, config);
    case HookEvent.SessionStart:
      return onSessionStart(input.source, input.session_id);
    case HookEvent.PostCompact:
      forgetSession(input.session_id);
      return Promise.resolve(null);
  }
};

const describeRaw = (raw: string) => {
  try {
    const value = JSON.parse(raw) as Record<string, unknown>;
    return { event: value["hook_event_name"], keys: Object.keys(value) };
  } catch {
    return { bytes: raw.length };
  }
};

const main = async () => {
  const raw = await readStdin();
  const parsed = HookInputSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) return log(LogLevel.Error, "unrecognized-input", { ...describeRaw(raw), issues: parsed.error.issues.slice(0, 3) });
  emit(await dispatch(parsed.data, loadConfig()));
};

main().catch((error) => log(LogLevel.Error, "hook-failed", { error: describeError(error) }));
