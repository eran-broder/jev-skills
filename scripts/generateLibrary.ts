import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const DOMAINS = ["aws", "gcp", "azure", "kubernetes", "terraform", "postgres", "redis", "kafka", "react", "vue", "django", "rails", "spring", "flutter", "unity", "stripe", "twilio", "shopify", "salesforce", "hubspot"];
const TASKS = ["migration", "monitoring", "cost-audit", "security-review", "backup", "load-testing", "onboarding", "incident-runbook", "schema-design", "ci-pipeline", "release-checklist", "rate-limiting", "caching", "logging", "tracing"];
const VERBS = ["Use when the user asks to", "Load when the request involves", "Apply whenever the user wants to"];

const description = (domain: string, task: string, i: number) =>
  `${VERBS[i % VERBS.length]} set up, review, or fix ${task.replace("-", " ")} for ${domain}. Covers ${domain}-specific conventions, common pitfalls, and the verification steps to run. Not for other platforms.`;

const body = (name: string) => `# ${name}\n\nWhen this skill is active, follow the ${name} checklist before making changes.\n`;

const writeSkill = (root: string, category: string, name: string, text: string, i: number) => {
  const dir = join(root, category, name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "SKILL.md"), `---\nname: ${name}\ndescription: ${text}\n---\n\n${body(name)}`);
};

export const generateLibrary = (root: string, count: number) => {
  let written = 0;
  for (let i = 0; written < count; i++) {
    const domain = DOMAINS[i % DOMAINS.length]!;
    const task = TASKS[Math.floor(i / DOMAINS.length) % TASKS.length]!;
    const round = Math.floor(i / (DOMAINS.length * TASKS.length));
    const name = round === 0 ? `${domain}-${task}` : `${domain}-${task}-v${round + 1}`;
    writeSkill(root, domain, name, description(domain, task, i), i);
    written++;
  }
  return written;
};

const isMain = process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  const [root, count] = process.argv.slice(2);
  if (root) console.log(`wrote ${generateLibrary(root, Number(count ?? 500))} skills under ${root}`);
}
