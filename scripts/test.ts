import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join } from "node:path";

const TEST_DIR = "test";
const TEST_SUFFIX = ".test.ts";

const files = readdirSync(TEST_DIR)
  .filter((name) => name.endsWith(TEST_SUFFIX))
  .map((name) => join(TEST_DIR, name));

const result = spawnSync(process.execPath, ["--import", "tsx", "--test", ...files], { stdio: "inherit" });
process.exit(result.status ?? 1);
