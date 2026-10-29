import { create } from 'zustand';
import { db } from '../sources/db.ts';
import { indexDictionary, lexiconFrom, type DictFile, type DictIndex } from './dictIndex.ts';
import dictVersion from './dictVersion.json';
import type { Lexicon } from './local/lexicon.ts';

// The whole Wiktionary dictionary (public/dict/de-en.json, CC BY-SA) is one
// file. It is downloaded the first time a song is analysed, kept on the device
// in IndexedDB and downloaded again only when the build writes a new version.
export interface DictionaryStatus {
  state: 'idle' | 'loading' | 'ready' | 'error';
  loaded: number; // bytes downloaded so far (uncompressed)
  total: number;
  fromCache: boolean;
}

// Also a React hook: useDictionaryStatus() re-renders as the download progresses.
export const useDictionaryStatus = create<DictionaryStatus>(() => ({
  state: 'idle', loaded: 0, total: dictVersion.bytes, fromCache: false,
}));
const set = useDictionaryStatus.setState;

async function readCached(): Promise<DictFile | null> {
  try {
    const row = await db.dict.get('de-en');
    if (row?.version !== dictVersion.version) return null;
    return JSON.parse(row.text);
  } catch {
    return null; // no IndexedDB (private mode) or a broken row: download again
  }
}

async function download(): Promise<DictFile> {
  const res = await fetch(`${import.meta.env.BASE_URL}dict/de-en.json?v=${dictVersion.version}`);
  if (!res.ok || !res.body) throw new Error(`Dictionary download failed: ${res.status}`);
  // Content-Length is the compressed size when the CDN gzips; count decoded bytes against the build's size.
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.length;
    set({ loaded, total: Math.max(dictVersion.bytes, loaded) });
  }
  const text = await new Blob(chunks as BlobPart[]).text();
  const file: DictFile = JSON.parse(text);
  db.dict.put({ id: 'de-en', version: file.v, text }).catch(() => {});
  return file;
}

async function load(): Promise<DictIndex> {
  set({ state: 'loading', loaded: 0 });
  const cached = await readCached();
  const file = cached ?? (await download());
  set({ state: 'ready', fromCache: !!cached, loaded: dictVersion.bytes });
  return indexDictionary(file);
}

let index: Promise<DictIndex> | null = null;

export function loadDictionary(): Promise<DictIndex> {
  index ??= load().catch((err) => {
    index = null; // let the next song try again
    set({ state: 'error' });
    throw err;
  });
  return index;
}

export async function dictionaryLexicon(words: Iterable<string>): Promise<Lexicon> {
  try {
    return lexiconFrom(await loadDictionary(), words);
  } catch {
    return {}; // offline on first run: the closed-class table still works
  }
}
