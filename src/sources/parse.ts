import { Lrc } from 'lrc-kit';
import wtf from 'wtf_wikipedia';
import type { RawLine } from '../types.ts';

export interface LrclibRecord {
  syncedLyrics: string | null;
  plainLyrics: string | null;
}

export function parseLrclib(rec: LrclibRecord): { synced: boolean; lines: RawLine[] } {
  if (rec.syncedLyrics) {
    const lines = Lrc.parse(rec.syncedLyrics).lyrics
      .map((l) => ({ time: l.timestamp, text: l.content.trim() }))
      .filter((l) => l.text);
    return { synced: true, lines };
  }
  const lines = (rec.plainLyrics ?? '')
    .split('\n')
    .map((t) => ({ time: null, text: t.trim() }))
    .filter((l) => l.text);
  return { synced: false, lines };
}

// Wikisource keeps poems in <poem> blocks. wtf_wikipedia strips the markup;
// we run it per line because it joins lines inside a paragraph.
export function parseWikisource(wikitext: string, title?: string): RawLine[] {
  const blocks = [...wikitext.matchAll(/<poem>([\s\S]*?)<\/poem>/g)].map((m) => m[1]);
  const lines: RawLine[] = [];
  for (const block of blocks) {
    for (const raw of block.split('\n')) {
      if (/^\s*'''.*'''\s*\.?\s*$/.test(raw.replace(/\{\{[^}]*\}\}/g, ''))) continue; // bold heading
      const text = wtf(raw.replace(/\{\{[^}]*\}\}/g, '')).text().trim();
      if (!text) continue;
      if (title && text.replace(/[.\s]/g, '').toLowerCase() === title.replace(/[.\s]/g, '').toLowerCase()) continue;
      lines.push({ time: null, text });
    }
  }
  return lines;
}

export function wikisourceTitle(url: string): string | null {
  const m = url.match(/wikisource\.org\/wiki\/(.+)$/);
  return m ? decodeURIComponent(m[1]).replace(/_/g, ' ') : null;
}

export function lrclibId(url: string): string | null {
  const m = url.match(/lrclib\.net\/api\/get\/(\d+)/);
  return m ? m[1] : null;
}
