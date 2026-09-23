const FENCE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

const unquote = (value: string) => value.replace(/^(["'])([\s\S]*)\1$/, "$2");

const isContinuation = (line: string) => /^\s+\S/.test(line);

export type Frontmatter = Record<string, string>;

export const splitFrontmatter = (source: string): { fields: Frontmatter; body: string } => {
  const match = source.match(FENCE);
  if (!match) return { fields: {}, body: source };
  return { fields: parseFields(match[1] ?? ""), body: source.slice(match[0].length) };
};

const parseFields = (block: string): Frontmatter => {
  const fields: Frontmatter = {};
  let current: string | null = null;
  for (const line of block.split(/\r?\n/)) {
    const pair = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (pair) {
      current = pair[1] ?? null;
      if (current) fields[current] = unquote((pair[2] ?? "").replace(/^[>|]-?\s*$/, "").trim());
    } else if (current && isContinuation(line)) {
      fields[current] = `${fields[current] ?? ""} ${line.trim()}`.trim();
    }
  }
  return fields;
};
