import { existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { dataHome } from "../paths";
import { readSkill, SkillSchema, type Skill } from "./skill";

const EntrySchema = z.object({ mtimeMs: z.number(), size: z.number(), skill: SkillSchema });
const IndexSchema = z.record(z.string(), EntrySchema);

type Index = z.infer<typeof IndexSchema>;

const indexFile = () => join(dataHome(), "index.json");

const readIndex = (): Index => {
  try {
    return IndexSchema.parse(JSON.parse(readFileSync(indexFile(), "utf8")));
  } catch {
    return {};
  }
};

const writeIndex = (index: Index) => {
  mkdirSync(dataHome(), { recursive: true });
  const temp = `${indexFile()}.${process.pid}.tmp`;
  writeFileSync(temp, JSON.stringify(index));
  renameSync(temp, indexFile());
};

const fresh = (entry: Index[string] | undefined, mtimeMs: number, size: number) =>
  entry !== undefined && entry.mtimeMs === mtimeMs && entry.size === size;

export const readSkillsCached = (files: string[]): Skill[] => {
  const previous = existsSync(indexFile()) ? readIndex() : {};
  const next: Index = {};
  let changed = false;
  for (const path of files) {
    const { mtimeMs, size } = statSync(path);
    const cached = previous[path];
    if (fresh(cached, mtimeMs, size)) {
      next[path] = cached!;
      continue;
    }
    next[path] = { mtimeMs, size, skill: readSkill(path) };
    changed = true;
  }
  if (changed || Object.keys(previous).length !== files.length) writeIndex(next);
  return files.map((path) => next[path]!.skill);
};
