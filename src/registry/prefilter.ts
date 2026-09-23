import type { Skill } from "./skill";

const TOKEN = /[a-z0-9]+/g;
const K1 = 1.2;
const B = 0.75;

const tokens = (text: string) => text.toLowerCase().match(TOKEN) ?? [];

type Document = { skill: Skill; terms: Map<string, number>; length: number };

const index = (skills: Skill[]): Document[] =>
  skills.map((skill) => {
    const terms = new Map<string, number>();
    const words = tokens(`${skill.name.replace(/-/g, " ")} ${skill.description}`);
    for (const word of words) terms.set(word, (terms.get(word) ?? 0) + 1);
    return { skill, terms, length: words.length };
  });

const documentFrequency = (documents: Document[]) => {
  const frequency = new Map<string, number>();
  for (const document of documents) for (const term of document.terms.keys()) frequency.set(term, (frequency.get(term) ?? 0) + 1);
  return frequency;
};

const idf = (count: number, total: number) => Math.log(1 + (total - count + 0.5) / (count + 0.5));

const score = (document: Document, query: string[], frequency: Map<string, number>, total: number, averageLength: number) =>
  query.reduce((sum, term) => {
    const tf = document.terms.get(term) ?? 0;
    if (tf === 0) return sum;
    const norm = tf * (K1 + 1) / (tf + K1 * (1 - B + (B * document.length) / averageLength));
    return sum + idf(frequency.get(term) ?? 0, total) * norm;
  }, 0);

export const prefilter = (skills: Skill[], queryText: string, keep: number): Skill[] => {
  if (skills.length <= keep) return skills;
  const documents = index(skills);
  const frequency = documentFrequency(documents);
  const averageLength = documents.reduce((sum, d) => sum + d.length, 0) / documents.length;
  const query = [...new Set(tokens(queryText))];
  return documents
    .map((document) => ({ skill: document.skill, score: score(document, query, frequency, documents.length, averageLength) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, keep)
    .map(({ skill }) => skill);
};
