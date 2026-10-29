// Fetches every text in data/library.json into .cache/lyrics/<slug>.json.
// .cache is git-ignored: these files must never be committed or pushed.
// Prints counts only, never lyrics.
import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { parseLrclib, parseWikisource, wikisourceTitle, lrclibId, type LrclibRecord } from '../src/sources/parse.ts';
import { loadLibrary } from '../src/data/library.ts';

const OUT = new URL('../.cache/lyrics/', import.meta.url);
const UA = 'Lernenstein/0.1 (open-source language-learning app; build script)';
const force = process.argv.includes('--force');

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function getJson(url: string): Promise<unknown> {
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (res.ok) return res.json();
    if (res.status === 404) throw new Error('404');
    await sleep(2000 * 2 ** attempt); // 503 / 429: back off
  }
  throw new Error('gave up after retries');
}

async function exists(u: URL) {
  try { await access(u); return true; } catch { return false; }
}

const library = loadLibrary(JSON.parse(await readFile(new URL('../data/library.json', import.meta.url), 'utf8')));
await mkdir(OUT, { recursive: true });

let ok = 0, skipped = 0, failed = 0;
for (const item of library) {
  const file = new URL(`${item.slug}.json`, OUT);
  if (!item.lyricsUrl || item.source === 'link') { skipped++; continue; }
  if (!force && await exists(file)) { skipped++; continue; }
  try {
    let record;
    const lrc = lrclibId(item.lyricsUrl);
    const ws = wikisourceTitle(item.lyricsUrl);
    if (lrc) {
      record = { source: 'lrclib', ...parseLrclib(await getJson(`https://lrclib.net/api/get/${lrc}`) as LrclibRecord) };
    } else if (ws) {
      const api = `https://de.wikisource.org/w/api.php?action=parse&format=json&prop=wikitext&redirects=1&page=${encodeURIComponent(ws)}`;
      const data = await getJson(api) as { parse: { wikitext: { '*': string } } };
      record = { source: 'wikisource', synced: false, lines: parseWikisource(data.parse.wikitext['*'], item.title) };
    } else {
      throw new Error('unknown source');
    }
    await writeFile(file, JSON.stringify({ slug: item.slug, url: item.lyricsUrl, fetchedAt: new Date().toISOString(), ...record }));
    console.log(`ok    ${item.slug} (${record.source}, ${record.lines.length} lines${record.synced ? ', synced' : ''})`);
    ok++;
  } catch (e) {
    console.log(`FAIL  ${item.slug}: ${(e as Error).message}`);
    failed++;
  }
  await sleep(1500);
}
console.log(`\n${ok} fetched, ${skipped} skipped, ${failed} failed`);
