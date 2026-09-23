import { existsSync, readFileSync } from "node:fs";
import { z } from "zod";

const TextBlock = z.object({ type: z.literal("text"), text: z.string() });
const NamedBlock = z.object({ type: z.string(), name: z.string().optional() });
const Block = z.union([TextBlock, NamedBlock]);
const Content = z.union([z.string(), Block.array()]);

enum EntryType {
  User = "user",
  Assistant = "assistant",
}

const Entry = z.object({
  type: z.enum(EntryType),
  isMeta: z.boolean().optional(),
  message: z.object({ content: Content }),
});

type Entry = z.infer<typeof Entry>;

export type RecentTurn = { assistant: string; tools: string[] };

const TAIL_BYTES = 200_000;

const tail = (path: string) => {
  const buffer = readFileSync(path);
  return buffer.subarray(Math.max(0, buffer.length - TAIL_BYTES)).toString("utf8");
};

const parseLine = (line: string): Entry | null => {
  try {
    const parsed = Entry.safeParse(JSON.parse(line));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
};

const textOf = (content: z.infer<typeof Content>) =>
  typeof content === "string" ? content : content.flatMap((b) => ("text" in b ? [b.text] : [])).join("\n");

const toolsOf = (content: z.infer<typeof Content>) =>
  typeof content === "string" ? [] : content.flatMap((b) => (b.type === "tool_use" && "name" in b && b.name ? [b.name] : []));

const isHumanPrompt = (entry: Entry) => entry.type === EntryType.User && !entry.isMeta && textOf(entry.message.content).length > 0;

const entries = (transcriptPath: string | undefined): Entry[] => {
  if (!transcriptPath || !existsSync(transcriptPath)) return [];
  return tail(transcriptPath).split("\n").flatMap((line) => parseLine(line) ?? []);
};

export const recentTurns = (transcriptPath: string | undefined, count: number): RecentTurn[] =>
  entries(transcriptPath)
    .filter((entry) => entry.type === EntryType.Assistant)
    .map((entry) => ({ assistant: textOf(entry.message.content), tools: toolsOf(entry.message.content) }))
    .slice(-count);

export const lastHumanPrompt = (transcriptPath: string | undefined): string =>
  entries(transcriptPath).filter(isHumanPrompt).map((entry) => textOf(entry.message.content)).at(-1) ?? "";
