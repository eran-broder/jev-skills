import { readFileSync } from "node:fs";
import { basename, dirname } from "node:path";
import { z } from "zod";
import { splitFrontmatter } from "./frontmatter";

export const SkillSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  category: z.string().min(1),
  path: z.string().min(1),
});

export type Skill = z.infer<typeof SkillSchema>;

const SKILL_FILE = "SKILL.md";

const categoryOf = (path: string, declared: string | undefined) => declared ?? basename(dirname(dirname(path)));

export const readSkill = (path: string): Skill => {
  const { fields } = splitFrontmatter(readFileSync(path, "utf8"));
  return SkillSchema.parse({
    name: fields["name"] ?? basename(dirname(path)),
    description: fields["description"],
    category: categoryOf(path, fields["category"]),
    path,
  });
};

export const readSkillBody = (skill: Skill) => splitFrontmatter(readFileSync(skill.path, "utf8")).body.trim();

export const isSkillFile = (name: string) => name === SKILL_FILE;
