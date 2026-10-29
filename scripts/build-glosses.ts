// Writes data/prebuilt/glosses/<slug>.json (git-ignored): every word of a song,
// sorted alphabetically (no order, no counts), with
//   - claude:     the hand-written gloss from data/prebuilt/gloss-table/*.json
//   - wiktionary: a backup looked up locally in .cache/kaikki-de.jsonl
// Stand-in for live model calls; replace later.
import { createReadStream } from 'node:fs';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { createInterface } from 'node:readline';

const root = new URL('../', import.meta.url);
const VOCAB = new URL('.cache/vocab/', root);
const TABLE = new URL('data/prebuilt/gloss-table/', root);
const OUT = new URL('data/prebuilt/glosses/', root);
const KAIKKI = new URL('.cache/kaikki-de.jsonl', root);

// 1. Hand-written table.
const table: Record<string, string> = {};
for (const f of (await readdir(TABLE)).filter((f) => f.endsWith('.json')).sort()) {
  Object.assign(table, JSON.parse(await readFile(new URL(f, TABLE), 'utf8')));
}

// 2. Song vocabularies.
const songs: Record<string, string[]> = {};
const all = new Set<string>();
for (const f of (await readdir(VOCAB)).filter((f) => f.endsWith('.json'))) {
  const words: string[] = JSON.parse(await readFile(new URL(f, VOCAB), 'utf8'));
  songs[f.replace(/\.json$/, '')] = words;
  words.forEach((w) => all.add(w));
}

// 3. Wiktionary backup: first matching entry per word, by headword or inflected form.
interface Wk { lemma: string; pos: string; gloss: string }
const wk = new Map<string, Wk>();
const cleanGloss = (g: string) => g.split('[')[0].replace(/\s*\([^)]*\)/g, '').split(/[;,]/)[0].trim();
const rl = createInterface({ input: createReadStream(KAIKKI), crlfDelay: Infinity });
for await (const line of rl) {
  const e = JSON.parse(line);
  const sense = (e.senses ?? []).find((s: { glosses?: string[]; form_of?: unknown }) => s.glosses?.length && !s.form_of);
  if (!sense) continue;
  const hit: Wk = { lemma: e.word, pos: e.pos, gloss: cleanGloss(sense.glosses[0]) };
  const keys = [e.word, ...(e.forms ?? []).map((f: { form: string }) => f.form)];
  for (const k of keys) {
    const low = String(k).toLowerCase();
    if (all.has(low) && !wk.has(low)) wk.set(low, hit);
  }
}

// 4. Per-song files.
await mkdir(OUT, { recursive: true });
let missingClaude = 0, missingWk = 0;
for (const [slug, words] of Object.entries(songs)) {
  const out: Record<string, { claude: string | null; wiktionary: Wk | null }> = {};
  for (const w of words) {
    out[w] = { claude: table[w] ?? null, wiktionary: wk.get(w) ?? null };
  }
  await writeFile(new URL(`${slug}.json`, OUT), JSON.stringify({ slug, words: out }, null, 1));
}
for (const w of all) {
  if (!table[w]) { missingClaude++; console.log(`no claude gloss: ${w}`); }
  if (!wk.has(w)) missingWk++;
}
console.log(`${Object.keys(songs).length} songs, ${all.size} words; ${missingClaude} without a Claude gloss, ${missingWk} without a Wiktionary match`);
