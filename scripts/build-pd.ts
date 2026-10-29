// Builds public/pd/<slug>.json for public-domain items: text, timings, full
// analysis and the English line translations from scripts/pd-sources.json.
// These files are committed (public domain only, see CLAUDE.md) and are what
// the app's "model" path serves for now.
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { analyzeLocal } from '../src/analysis/local/analyze.ts';
import type { Lexicon } from '../src/analysis/local/lexicon.ts';
import { vocabulary } from '../src/analysis/local/tokenize.ts';
import { indexDictionary, lexiconFrom } from '../src/analysis/dictIndex.ts';
import type { RawLine } from '../src/types.ts';

const root = new URL('../', import.meta.url);
const read = async (p: string) => JSON.parse(await readFile(new URL(p, root), 'utf8'));
const tryRead = (p: string) => read(p).catch(() => null);

const sources: Record<string, { credit: string; de?: string[]; en: string[] }> = await read('scripts/pd-sources.json');
delete (sources as Record<string, unknown>)._note;

// Hand-written word glosses (git-ignored, optional).
const table: Record<string, string> = {};
for (const f of await readdir(new URL('data/prebuilt/gloss-table/', root)).catch(() => [] as string[])) {
  Object.assign(table, await read(`data/prebuilt/gloss-table/${f}`));
}

const dict = indexDictionary(await read('public/dict/de-en.json'));

function lexicon(lines: RawLine[]): Lexicon {
  const words = vocabulary(lines.map((l) => l.text));
  const lex = lexiconFrom(dict, words);
  for (const w of words) {
    if (table[w]) lex[w] = { claude: table[w], wiktionary: lex[w]?.wiktionary ?? null, candidates: lex[w]?.candidates };
  }
  return lex;
}

await mkdir(new URL('public/pd/', root), { recursive: true });
for (const [slug, src] of Object.entries(sources)) {
  let lines: RawLine[];
  if (src.de) lines = src.de.map((text) => ({ time: null, text }));
  else {
    const cached = await tryRead(`.cache/lyrics/${slug}.json`);
    if (!cached) { console.log(`skip  ${slug}: run npm run fetch:lyrics first`); continue; }
    lines = cached.lines;
  }
  if (lines.length !== src.en.length) throw new Error(`${slug}: ${lines.length} German lines but ${src.en.length} translations`);
  const song = analyzeLocal(slug, lines, lexicon(lines));
  song.engine = 'model';
  song.lines.forEach((l, i) => { l.translation = src.en[i]; });
  await writeFile(new URL(`public/pd/${slug}.json`, root), JSON.stringify({ credit: src.credit, song }));
  console.log(`ok    ${slug} (${lines.length} lines)`);
}
