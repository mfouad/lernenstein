import Dexie, { type EntityTable } from 'dexie';
import type { AnalyzedSong, RawLine } from '../types.ts';

// Everything here lives on the user's device only.
export interface CachedText {
  slug: string;
  url: string;
  source: 'lrclib' | 'wikisource';
  synced: boolean;
  lines: RawLine[];
  fetchedAt: string;
}

export interface CachedAnalysis {
  slug: string;
  version: number;
  song: AnalyzedSong;
}

export interface CachedTranslation {
  key: string; // the German line
  text: string;
}

// The Wiktionary dictionary as downloaded (raw JSON text; parsed on load).
export interface CachedDict {
  id: string;
  version: string;
  text: string;
}

export const db = new Dexie('lernenstein') as Dexie & {
  texts: EntityTable<CachedText, 'slug'>;
  analyses: EntityTable<CachedAnalysis, 'slug'>;
  translations: EntityTable<CachedTranslation, 'key'>;
  dict: EntityTable<CachedDict, 'id'>;
};

db.version(1).stores({
  texts: 'slug',
  analyses: 'slug',
  translations: 'key',
});
db.version(2).stores({ dict: 'id' });

// Ask the browser not to evict the cache under storage pressure.
export async function persistStorage() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) await navigator.storage.persist();
  } catch {
    // Not supported: the cache still works, it just may be evicted.
  }
}
