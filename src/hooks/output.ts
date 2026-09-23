import type { HookEvent } from "./input";

export type HookOutput = {
  hookSpecificOutput: { hookEventName: HookEvent; additionalContext: string };
  systemMessage?: string;
};

export const contextOutput = (event: HookEvent, additionalContext: string, systemMessage?: string): HookOutput => ({
  hookSpecificOutput: { hookEventName: event, additionalContext },
  ...(systemMessage ? { systemMessage } : {}),
});

export const emit = (output: HookOutput | null) => {
  if (output) process.stdout.write(JSON.stringify(output));
};
