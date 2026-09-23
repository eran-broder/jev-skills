import type { Config } from "../config";
import { requireApiKey } from "../config";
import { createJevClient } from "../jev/client";
import { fanout, type FanoutOptions, type FanoutResult } from "../jev/fanout";
import { judgingRule, QuestionStyle, skillQuestion, Trigger } from "../jev/questions";
import { prefilter } from "../registry/prefilter";
import { scanLibraries } from "../registry/scan";
import type { Skill } from "../registry/skill";
import { selectSkills, type Selected } from "./select";
import { loadSession } from "./session";
import type { ObserverState } from "./state";

export type Observation = {
  selected: Selected[];
  aboveThreshold: number;
  candidates: number;
  library: number;
  requests: number;
  jevInputTokens: number;
  elapsedMs: number;
};

const fanoutOptions = (config: Config): FanoutOptions => ({
  model: config.model,
  requestTokenBudget: config.requestTokenBudget,
  concurrency: config.concurrency,
});

const queryText = (state: ObserverState) =>
  [state.request, state.latest_tool_result?.output ?? "", ...state.recent_conversation.map((turn) => turn.assistant)].join("\n");

const narrow = (library: Skill[], state: ObserverState, config: Config) =>
  library.length > config.prefilterAbove ? prefilter(library, queryText(state), config.prefilterKeep) : library;

const withRule = (state: ObserverState, trigger: Trigger, style: QuestionStyle) =>
  style === QuestionStyle.Slim ? { ...state, how_to_judge_a_skill: judgingRule(trigger) } : state;

const countAbove = (skills: Skill[], result: FanoutResult, threshold: number) =>
  skills.filter((skill) => (result.verdicts.get(skill.name) ?? 0) >= threshold).length;

export const observe = async (state: ObserverState, trigger: Trigger, sessionId: string, config: Config): Promise<Observation> => {
  const started = performance.now();
  const client = createJevClient(requireApiKey(config), config.timeoutMs);
  const library = scanLibraries(config.libraries);
  const candidates = narrow(library, state, config);
  const questions = candidates.map(skillQuestion(trigger, config.questionStyle));
  const result = await fanout(client, withRule(state, trigger, config.questionStyle), questions, fanoutOptions(config));
  const exclude = new Set(loadSession(sessionId).injected);
  return {
    selected: selectSkills(candidates, result.verdicts, config.threshold, config.maxSkillsPerTurn, exclude),
    aboveThreshold: countAbove(candidates, result, config.threshold),
    candidates: candidates.length,
    library: library.length,
    requests: result.requests,
    jevInputTokens: result.inputTokens,
    elapsedMs: performance.now() - started,
  };
};
