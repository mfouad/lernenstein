import type { SyncPoint } from '../lib/sync.ts';
import type { LibraryItem } from '../types.ts';

interface RawEntry {
  slug: string;
  title: string;
  artist?: string;
  author?: string;
  youtubeId: string | null;
  lyricsUrl: string | null;
  source: LibraryItem['source'];
  rights: LibraryItem['rights'];
  genre?: string;
  level: string;
  why_it_works: string;
  sync?: SyncPoint[];
}

export interface RawLibrary {
  songs: RawEntry[];
  poems: RawEntry[];
}

export function loadLibrary(raw: RawLibrary): LibraryItem[] {
  const map = (kind: LibraryItem['kind']) => (e: RawEntry): LibraryItem => ({
    slug: e.slug,
    kind,
    title: e.title,
    by: e.artist ?? e.author ?? '',
    youtubeId: e.youtubeId,
    lyricsUrl: e.lyricsUrl,
    source: e.source,
    rights: e.rights,
    genre: e.genre,
    level: e.level,
    why_it_works: e.why_it_works,
    sync: e.sync,
  });
  return [...raw.songs.map(map('song')), ...raw.poems.map(map('poem'))];
}

// The inverse of loadLibrary: the shape of data/library.json. Empty optional fields are
// left out, and sync points are kept ordered by line time.
export function serializeLibrary(items: LibraryItem[]): RawLibrary {
  const entry = (i: LibraryItem): RawEntry => ({
    slug: i.slug,
    title: i.title,
    [i.kind === 'song' ? 'artist' : 'author']: i.by,
    youtubeId: i.youtubeId || null,
    lyricsUrl: i.lyricsUrl || null,
    source: i.source,
    rights: i.rights,
    ...(i.genre ? { genre: i.genre } : {}),
    level: i.level,
    why_it_works: i.why_it_works,
    ...(i.sync?.length ? { sync: [...i.sync].sort((a, b) => a.line - b.line) } : {}),
  });
  return {
    songs: items.filter((i) => i.kind === 'song').map(entry),
    poems: items.filter((i) => i.kind === 'poem').map(entry),
  };
}
