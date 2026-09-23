import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { dataHome } from "../paths";

const SessionStateSchema = z.object({
  injected: z.string().array().default([]),
});

type SessionState = z.infer<typeof SessionStateSchema>;

const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const sessionsDir = () => join(dataHome(), "sessions");

const sessionFile = (sessionId: string) => join(sessionsDir(), `${sessionId.replace(/[^A-Za-z0-9_-]/g, "_")}.json`);

export const loadSession = (sessionId: string): SessionState => {
  const file = sessionFile(sessionId);
  if (!existsSync(file)) return SessionStateSchema.parse({});
  return SessionStateSchema.parse(JSON.parse(readFileSync(file, "utf8")));
};

export const saveSession = (sessionId: string, state: SessionState) => {
  mkdirSync(sessionsDir(), { recursive: true });
  writeFileSync(sessionFile(sessionId), JSON.stringify(state));
};

export const rememberInjected = (sessionId: string, names: string[]) => {
  const state = loadSession(sessionId);
  saveSession(sessionId, { injected: [...new Set([...state.injected, ...names])] });
};

export const forgetSession = (sessionId: string) => saveSession(sessionId, { injected: [] });

export const pruneStaleSessions = (now = Date.now()) => {
  if (!existsSync(sessionsDir())) return;
  for (const name of readdirSync(sessionsDir())) {
    const file = join(sessionsDir(), name);
    if (now - statSync(file).mtimeMs > MAX_AGE_MS) rmSync(file, { force: true });
  }
};
