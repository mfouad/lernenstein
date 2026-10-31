import raw from '../../data/library.json';
import { loadLibrary, serializeLibrary, type RawLibrary } from '../data/library.ts';
import { isLocal } from '../lib/route.ts';
import type { LibraryItem } from '../types.ts';

const KEY = 'lernenstein-studio-draft';

export const shipped = (): LibraryItem[] => loadLibrary(raw as RawLibrary);

export function loadDraft(): LibraryItem[] {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved) return loadLibrary(JSON.parse(saved) as RawLibrary);
  } catch {
    // Unreadable draft: fall back to the shipped library.
  }
  return shipped();
}

export function saveDraft(items: LibraryItem[]) {
  try { localStorage.setItem(KEY, toJson(items)); } catch { /* storage full or blocked */ }
}

export const toJson = (items: LibraryItem[]) => JSON.stringify(serializeLibrary(items), null, 2) + '\n';

// What the app shows: on this machine the studio draft (so edits and new entries appear at
// once), anywhere else the shipped library.
export const currentLibrary = (): LibraryItem[] => (isLocal ? loadDraft() : shipped());

// Append a blank entry to the saved draft and return its slug.
export function addDraftItem(kind: LibraryItem['kind']): string {
  const items = loadDraft();
  const item = blankItem(kind, new Set(items.map((i) => i.slug)));
  saveDraft([...items, item]);
  return item.slug;
}

export function blankItem(kind: LibraryItem['kind'], taken: Set<string>): LibraryItem {
  let n = 1;
  while (taken.has(`new-${kind}-${n}`)) n++;
  return {
    slug: `new-${kind}-${n}`, kind, title: 'Untitled', by: '', youtubeId: null, lyricsUrl: null,
    source: kind === 'song' ? 'lrclib' : 'static', rights: kind === 'song' ? 'copyrighted' : 'pd',
    level: 'Beginner', why_it_works: '',
  };
}

// Accept a full YouTube link as well as a bare id.
export function parseYoutubeId(input: string): string | null {
  const v = input.trim();
  if (!v) return null;
  const m = v.match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/)([\w-]{11})/);
  return m ? m[1] : v;
}

export interface Problem { slug: string; message: string; fatal: boolean }

export function validate(items: LibraryItem[]): Problem[] {
  const out: Problem[] = [];
  const seen = new Map<string, number>();
  items.forEach((i) => seen.set(i.slug, (seen.get(i.slug) ?? 0) + 1));
  for (const i of items) {
    const add = (message: string, fatal = false) => out.push({ slug: i.slug, message, fatal });
    if (!i.slug.trim()) add('Slug is empty', true);
    else if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(i.slug)) add('Slug should be lowercase letters, digits and dashes');
    if ((seen.get(i.slug) ?? 0) > 1) add('Slug is used more than once', true);
    if (!i.title.trim()) add('Title is empty', true);
    if (i.youtubeId && !/^[\w-]{11}$/.test(i.youtubeId)) add('YouTube id should be 11 characters');
    if (i.lyricsUrl && !/^https?:\/\//.test(i.lyricsUrl)) add('Lyrics URL should start with http(s)://');
    if (i.source !== 'link' && i.source !== 'static' && !i.lyricsUrl) add('This source needs a lyrics URL');
  }
  return out;
}
