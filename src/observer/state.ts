import { basename } from "node:path";
import type { PostToolUse, UserPromptSubmit } from "../hooks/input";
import { lastHumanPrompt, recentTurns, type RecentTurn } from "./transcript";

export type ObserverState = {
  request: string;
  recent_conversation: { assistant: string; tools_used: string[] }[];
  latest_tool_result?: { tool: string; input: unknown; output: string };
  project_directory?: string;
};

const RECENT_TURNS = 3;

const clip = (text: string, max: number) => (text.length <= max ? text : `${text.slice(0, max)}…`);

const summarizeTurn = (turn: RecentTurn, budget: number) => ({ assistant: clip(turn.assistant, budget), tools_used: turn.tools });

const asText = (value: unknown) => (typeof value === "string" ? value : JSON.stringify(value ?? ""));

const conversation = (transcriptPath: string | undefined, budget: number) =>
  recentTurns(transcriptPath, RECENT_TURNS).map((turn) => summarizeTurn(turn, Math.floor(budget / RECENT_TURNS)));

export const promptState = (input: UserPromptSubmit, budget: number): ObserverState => ({
  request: clip(input.prompt, budget),
  recent_conversation: conversation(input.transcript_path, budget / 2),
  ...(input.cwd ? { project_directory: basename(input.cwd) } : {}),
});

export const toolState = (input: PostToolUse, budget: number): ObserverState => ({
  request: clip(lastHumanPrompt(input.transcript_path), budget / 2),
  recent_conversation: conversation(input.transcript_path, budget / 4),
  latest_tool_result: { tool: input.tool_name, input: input.tool_input, output: clip(asText(input.tool_response), budget / 2) },
});
