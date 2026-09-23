import type { Skill } from "../registry/skill";
import type { Question } from "./fanout";

export enum Trigger {
  Prompt = "prompt",
  ToolResult = "tool-result",
}

export enum QuestionStyle {
  Full = "full",
  Slim = "slim",
}

const SKILL_QUESTION: Record<Trigger, string> = {
  [Trigger.Prompt]: "Would loading this skill's instructions help the assistant with the user's current `request`, given the `recent_conversation`?",
  [Trigger.ToolResult]:
    "The assistant is working on the user's `request` and just received `latest_tool_result`. Does the content of `latest_tool_result` show that this skill's instructions are needed for the work now in progress?",
};

const CRITERIA = {
  true: "The situation matches what the skill description says the skill is for, so its instructions would be used now",
  false: "The situation is about something else, or the skill would not be used for it",
};

const SLIM_QUESTION = "Is this skill needed now? Judge by the `how_to_judge_a_skill` rule in the state.";

export const judgingRule = (trigger: Trigger) => `${SKILL_QUESTION[trigger]} Yes means: ${CRITERIA.true}. No means: ${CRITERIA.false}.`;

const fullQuestion = (trigger: Trigger, skill: Skill): Question => ({
  id: skill.name,
  noul: { type: "noul", instructions: { skill: skill.name, skill_description: skill.description, question: SKILL_QUESTION[trigger] }, criteria: CRITERIA },
});

const slimQuestion = (skill: Skill): Question => ({
  id: skill.name,
  noul: { type: "noul", instructions: { skill: skill.name, skill_description: skill.description, question: SLIM_QUESTION } },
});

export const skillQuestion = (trigger: Trigger, style: QuestionStyle) => (skill: Skill): Question =>
  style === QuestionStyle.Full ? fullQuestion(trigger, skill) : slimQuestion(skill);
