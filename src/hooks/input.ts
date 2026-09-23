import { z } from "zod";

export enum HookEvent {
  UserPromptSubmit = "UserPromptSubmit",
  PostToolUse = "PostToolUse",
  SessionStart = "SessionStart",
  PostCompact = "PostCompact",
}

const Common = z.object({
  session_id: z.string().min(1),
  transcript_path: z.string().nullish().transform((value) => value ?? undefined),
  cwd: z.string().nullish().transform((value) => value ?? undefined),
  hook_event_name: z.string(),
});

export const UserPromptSubmitInput = Common.extend({
  hook_event_name: z.literal(HookEvent.UserPromptSubmit),
  prompt: z.string(),
});

export const PostToolUseInput = Common.extend({
  hook_event_name: z.literal(HookEvent.PostToolUse),
  tool_name: z.string(),
  tool_input: z.unknown().optional(),
  tool_response: z.unknown().optional(),
});

export const SessionStartInput = Common.extend({
  hook_event_name: z.literal(HookEvent.SessionStart),
  source: z.string().optional(),
});

export const PostCompactInput = Common.extend({
  hook_event_name: z.literal(HookEvent.PostCompact),
});

export const HookInputSchema = z.discriminatedUnion("hook_event_name", [
  UserPromptSubmitInput,
  PostToolUseInput,
  SessionStartInput,
  PostCompactInput,
]);

export type HookInput = z.infer<typeof HookInputSchema>;
export type UserPromptSubmit = z.infer<typeof UserPromptSubmitInput>;
export type PostToolUse = z.infer<typeof PostToolUseInput>;

export const readStdin = async (): Promise<string> => {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8");
};
