import { appendFileSync, mkdirSync, renameSync, statSync } from "node:fs";
import { join } from "node:path";
import { dataHome } from "./paths";

export enum LogLevel {
  Info = "info",
  Error = "error",
}

const MAX_LOG_BYTES = 2_000_000;

const logFile = () => join(dataHome(), "log.jsonl");

const rotateIfLarge = (file: string) => {
  try {
    if (statSync(file).size > MAX_LOG_BYTES) renameSync(file, `${file}.1`);
  } catch {
    return;
  }
};

export const log = (level: LogLevel, event: string, details: Record<string, unknown> = {}) => {
  mkdirSync(dataHome(), { recursive: true });
  rotateIfLarge(logFile());
  appendFileSync(logFile(), `${JSON.stringify({ at: new Date().toISOString(), level, event, ...details })}\n`);
};

export const describeError = (error: unknown) => (error instanceof Error ? `${error.name}: ${error.message}` : String(error));
