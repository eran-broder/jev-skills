import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { readSkillsCached } from "./index";
import { isSkillFile, type Skill } from "./skill";

const MAX_DEPTH = 4;

const HIDDEN = /^\./;

const walk = (dir: string, depth: number, found: string[]) => {
  if (depth > MAX_DEPTH || !existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (HIDDEN.test(entry.name) || entry.name === "node_modules") continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path, depth + 1, found);
    else if (isSkillFile(entry.name)) found.push(path);
  }
};

const dedupeByName = (skills: Skill[]) => [...new Map(skills.map((skill) => [skill.name, skill])).values()];

export const scanLibraries = (libraries: string[]): Skill[] => {
  const files: string[] = [];
  for (const library of libraries) walk(library, 0, files);
  return dedupeByName(readSkillsCached(files));
};
