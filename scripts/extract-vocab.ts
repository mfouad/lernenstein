// Turns cached lyrics into unordered word lists (sorted, no counts, no order).
// Writes .cache/vocab/<slug>.json and .cache/vocab/all.txt. Both git-ignored.
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { vocabulary } from '../src/analysis/local/tokenize.ts';

const IN = new URL('../.cache/lyrics/', import.meta.url);
const OUT = new URL('../.cache/vocab/', import.meta.url);
await mkdir(OUT, { recursive: true });

const all = new Set<string>();
for (const f of (await readdir(IN)).filter((f) => f.endsWith('.json'))) {
  const { slug, lines } = JSON.parse(await readFile(new URL(f, IN), 'utf8'));
  const words = [...vocabulary(lines.map((l: { text: string }) => l.text))].sort((a, b) => a.localeCompare(b, 'de'));
  words.forEach((w) => all.add(w));
  await writeFile(new URL(`${slug}.json`, OUT), JSON.stringify(words));
}
const sorted = [...all].sort((a, b) => a.localeCompare(b, 'de'));
await writeFile(new URL('all.txt', OUT), sorted.join('\n') + '\n');
console.log(`${sorted.length} distinct words`);
