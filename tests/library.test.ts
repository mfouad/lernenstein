import { describe, expect, it } from 'vitest';
import raw from '../data/library.json';
import { loadLibrary, serializeLibrary, type RawLibrary } from '../src/data/library.ts';
import { parseYoutubeId, validate } from '../src/studio/draft.ts';

describe('library round trip', () => {
  it('serialises the shipped library back to the same JSON', () => {
    expect(serializeLibrary(loadLibrary(raw as RawLibrary))).toEqual(raw);
  });

  it('keeps sync points ordered and drops empty ones', () => {
    const [a, b] = loadLibrary(raw as RawLibrary);
    const out = serializeLibrary([
      { ...a, sync: [{ line: 20, video: 25 }, { line: 5, video: 8 }] },
      { ...b, sync: [] },
    ]);
    expect(out.songs[0].sync).toEqual([{ line: 5, video: 8 }, { line: 20, video: 25 }]);
    expect(out.songs[1]).not.toHaveProperty('sync');
  });
});

describe('studio helpers', () => {
  it('extracts a YouTube id from links', () => {
    expect(parseYoutubeId('https://www.youtube.com/watch?v=Fpu5a0Bl8eY&t=3')).toBe('Fpu5a0Bl8eY');
    expect(parseYoutubeId('https://youtu.be/Fpu5a0Bl8eY')).toBe('Fpu5a0Bl8eY');
    expect(parseYoutubeId('')).toBeNull();
  });

  it('flags duplicate slugs as fatal', () => {
    const [a] = loadLibrary(raw as RawLibrary);
    expect(validate([a, a]).some((p) => p.fatal)).toBe(true);
    expect(validate([a])).toEqual([]);
  });
});

describe('routes', () => {
  it('parses hash routes', async () => {
    const { parseRoute, studioHref } = await import('../src/lib/route.ts');
    expect(parseRoute('')).toEqual({ page: 'app' });
    expect(parseRoute('#/library')).toEqual({ page: 'library' });
    expect(parseRoute('#/studio')).toEqual({ page: 'studio', slug: undefined });
    expect(parseRoute(studioHref('a b'))).toEqual({ page: 'studio', slug: 'a b' });
  });
});

describe('youtube name guessing', () => {
  it('splits "Artist - Title" and strips video noise', async () => {
    const { guessNames } = await import('../src/studio/lookup.ts');
    expect(guessNames({ title: 'Nena - 99 Luftballons (Official Video)', channel: 'NenaVEVO' })).toEqual({ by: 'Nena', title: '99 Luftballons' });
    expect(guessNames({ title: 'Mutter [Official 4K Video]', channel: 'Rammstein Official' })).toEqual({ by: 'Rammstein', title: 'Mutter' });
  });
});

describe('youtube name guessing, other separators', () => {
  it('handles pipes and year tags', async () => {
    const { guessNames } = await import('../src/studio/lookup.ts');
    expect(guessNames({ title: 'NENA | 99 Luftballons [1983]', channel: 'NENA' })).toEqual({ by: 'NENA', title: '99 Luftballons' });
  });
});
