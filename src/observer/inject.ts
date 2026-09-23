import { InjectMode } from "../config";
import { readSkillBody } from "../registry/skill";
import type { Selected } from "./select";

const HEADER = "The following skills were identified as relevant to this turn by the jev-skills observer. Follow their instructions where they apply.";

const clipBody = (body: string, budget: number, path: string) =>
  body.length <= budget ? body : `${body.slice(0, budget)}\n\n[truncated; full instructions at ${path}]`;

const renderFull = ({ skill }: Selected, budget: number) =>
  `<skill name="${skill.name}" path="${skill.path}">\n${clipBody(readSkillBody(skill), budget, skill.path)}\n</skill>`;

const renderPointer = ({ skill }: Selected) =>
  `<skill name="${skill.name}" path="${skill.path}">\n${skill.description}\nRead the file at the path above before acting on it.\n</skill>`;

export const renderContext = (selected: Selected[], mode: InjectMode, budgetChars: number) => {
  const perSkill = Math.floor(budgetChars / Math.max(1, selected.length));
  const blocks = selected.map((s) => (mode === InjectMode.Full ? renderFull(s, perSkill) : renderPointer(s)));
  return [HEADER, ...blocks].join("\n\n");
};

export const renderNotice = (selected: Selected[]) =>
  `jev-skills loaded: ${selected.map(({ skill, probability }) => `${skill.name} (${probability.toFixed(2)})`).join(", ")}`;
