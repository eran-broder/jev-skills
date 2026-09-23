import type { Verdicts } from "../jev/fanout";
import type { Skill } from "../registry/skill";

export type Selected = { skill: Skill; probability: number };

export const selectSkills = (skills: Skill[], verdicts: Verdicts, threshold: number, limit: number, exclude: Set<string>): Selected[] =>
  skills
    .map((skill) => ({ skill, probability: verdicts.get(skill.name) ?? 0 }))
    .filter(({ skill, probability }) => probability >= threshold && !exclude.has(skill.name))
    .sort((a, b) => b.probability - a.probability)
    .slice(0, limit);

export const selectCategories = (categories: string[], verdicts: Verdicts, threshold: number, limit: number): string[] =>
  categories
    .map((category) => ({ category, probability: verdicts.get(category) ?? 0 }))
    .filter(({ probability }) => probability >= threshold)
    .sort((a, b) => b.probability - a.probability)
    .slice(0, limit)
    .map(({ category }) => category);
