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
  });
  return [...raw.songs.map(map('song')), ...raw.poems.map(map('poem'))];
}
