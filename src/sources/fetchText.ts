import type { LibraryItem } from '../types.ts';
import { db, type CachedText } from './db.ts';
import { lrclibId, parseLrclib, parseWikisource, wikisourceTitle, type LrclibRecord } from './parse.ts';

export class SourceError extends Error {}

async function fetchJson(url: string, headers: Record<string, string> = {}) {
  const res = await fetch(url, { headers });
  if (!res.ok) throw new SourceError(`${res.status} from ${new URL(url).host}`);
  return res.json();
}

// Fetches from the external source; no caching here.
export async function fetchFromSource(item: LibraryItem): Promise<CachedText> {
  const url = item.lyricsUrl;
  if (!url) throw new SourceError('No lyrics link for this item');
  const id = lrclibId(url);
  if (id) {
    const parsed = parseLrclib(await fetchJson(`https://lrclib.net/api/get/${id}`) as LrclibRecord);
    return { slug: item.slug, url, source: 'lrclib', fetchedAt: new Date().toISOString(), ...parsed };
  }
  const title = wikisourceTitle(url);
  if (title) {
    const api = `https://de.wikisource.org/w/api.php?action=parse&format=json&origin=*&prop=wikitext&redirects=1&page=${encodeURIComponent(title)}`;
    const data = await fetchJson(api, { 'Api-User-Agent': 'Lernenstein/0.1 (open-source language-learning app)' });
    if (!data.parse) throw new SourceError('Page not found on Wikisource');
    return { slug: item.slug, url, source: 'wikisource', synced: false, fetchedAt: new Date().toISOString(), lines: parseWikisource(data.parse.wikitext['*'], item.title) };
  }
  throw new SourceError('Unsupported lyrics source');
}

// Cache-first: a text opened once keeps working even if the source goes away.
// A fresh copy replaces the cached one in the background when the source answers.
export async function loadText(item: LibraryItem): Promise<CachedText> {
  const cached = await db.texts.get(item.slug);
  if (cached) {
    fetchFromSource(item).then((fresh) => db.texts.put(fresh)).catch(() => {});
    return cached;
  }
  const fresh = await fetchFromSource(item);
  await db.texts.put(fresh);
  return fresh;
}
