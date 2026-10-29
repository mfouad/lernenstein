// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { cleanGloss, isPointerGloss, joinGlosses, orderForForm, type FormReading } from '../scripts/dict-utils.ts';
import { indexDictionary, lexiconFrom, type DictFile } from '../src/analysis/dictIndex.ts';
import { lookup, type Lexicon } from '../src/analysis/local/lexicon.ts';
import dictVersion from '../src/analysis/dictVersion.json';

// Invented glosses and entries only, plus the committed Wiktionary dictionary.
describe('cleanGloss', () => {
  it.each([
    ['he (third person (masculine) subject)', 'he'],
    ['he, it)', 'he, it'],
    ['I (first person (subject) pronoun)', 'I'],
    ['a thought [with an (+ accusative) ‘[of/about] (something)’]', 'a thought'],
    ['a thought ’]', 'a thought'],
    ['house (a building', 'house'],
    ['she; her', 'she'],
    ['“quoted”.', 'quoted'],
    ['to walk , slowly', 'to walk, slowly'],
    ['vapor / vapour', 'vapor, vapour'],
  ])('%s → %s', (raw, clean) => expect(cleanGloss(raw)).toBe(clean));

  it('shortens at a comma or word boundary, without a dangling little word', () => {
    expect(cleanGloss('a wall, usually one made of stone or brick and quite tall')).toBe('a wall');
    expect(cleanGloss('something that is very long and keeps on going for ever', 30)).toBe('something that is very long');
  });
});

describe('isPointerGloss', () => {
  it.each(['dative of sie', 'obsolete spelling of dass', 'As a copulative verb:', 'nominative masculine singular definite article', 'forms the perfect tense'])(
    'skips %s', (g) => expect(isPointerGloss(g)).toBe(true));
  it.each(['first', 'to go, to walk', 'she', 'a person of note'])('keeps %s', (g) => expect(isPointerGloss(g)).toBe(false));
});

describe('joinGlosses', () => {
  it('keeps at most two meanings and skips pointers and duplicates', () => {
    expect(joinGlosses(['dative of sie', 'dog (animal)', 'dog', 'hound', 'cur'])).toBe('dog / hound');
  });
  it('drops parts an earlier meaning already gave', () => {
    expect(joinGlosses(['park', 'park, grounds'])).toBe('park / grounds');
  });
  it('leaves out a second meaning that would need cutting', () => {
    expect(joinGlosses(['tree', 'a tall plant with a wooden trunk and branches far above the ground'])).toBe('tree');
  });
});

describe('orderForForm', () => {
  const readings: FormReading[] = [
    { lemma: 'er', pos: 'pron' }, { lemma: 'du', pos: 'pron' }, { lemma: 'ich', pos: 'pron' }, { lemma: 'wir', pos: 'pron' },
    { lemma: 'sie', pos: 'pron' }, { lemma: 'Sie', pos: 'pron' }, { lemma: 'Sie', pos: 'name' },
  ];
  const of = (id: number) => readings[id];

  it('puts headwords first, even past the limit of inflections', () => {
    expect(orderForForm('sie', [0, 1, 2, 3, 4, 5], of, 4)).toEqual([4, 5, 0, 1]);
  });

  it('never cuts off a headword', () => {
    const many = Array.from({ length: 6 }, () => ({ lemma: 'Bank', pos: 'noun' }));
    expect(orderForForm('bank', [0, 1, 2, 3, 4, 5], (id) => many[id], 4)).toHaveLength(6);
  });

  it('puts proper names after common words', () => {
    const r: FormReading[] = [{ lemma: 'Walden', pos: 'name' }, { lemma: 'walden', pos: 'verb' }, { lemma: 'Wald', pos: 'noun' }];
    expect(orderForForm('walden', [0, 1, 2], (id) => r[id], 4)).toEqual([1, 2, 0]);
  });

  it('puts a past participle before an adjective of the same spelling', () => {
    const r: FormReading[] = [{ lemma: 'gelaufen', pos: 'adj' }, { lemma: 'laufen', pos: 'verb', pastParticiple: true }];
    expect(orderForForm('gelaufen', [0, 1], (id) => r[id], 4)).toEqual([1, 0]);
  });
});

describe('closed-class glosses', () => {
  // A dictionary row in the wrong order must not leak into common words.
  const misleading: Lexicon = Object.fromEntries(['sie', 'mir', 'im', 'bin'].map((w) => [w, {
    claude: null, wiktionary: null, candidates: [{ lemma: 'er', pos: 'pron', gloss: 'he' }],
  }]));

  it.each([['sie', 'she / they / them'], ['mir', '(to) me'], ['im', 'in the'], ['bin', 'am']])('%s → %s', (w, gloss) => {
    const e = lookup(w, w, misleading, false);
    expect(e.closed).toBe(true);
    expect(e.gloss).toBe(gloss);
  });

  it('a hand-written gloss still wins', () => {
    expect(lookup('sie', 'sie', { sie: { claude: 'she (here)', wiktionary: null } }, false).gloss).toBe('she (here)');
  });
});

describe('dictionary index', () => {
  const file: DictFile = {
    v: 'test',
    e: [['Stille', 'noun', 'f', 'silence'], ['still', 'adj', '', 'quiet'], ['Haus', 'noun', 'n', 'house']],
    f: { stille: [0, 1], haus: [2] },
  };

  it('keeps candidate order and falls back to the full form of elisions', () => {
    const lex = lexiconFrom(indexDictionary(file), ['still', 'haus']);
    expect(lex.stille.candidates!.map((c) => c.lemma)).toEqual(['Stille', 'still']);
    expect(lex.haus.wiktionary).toMatchObject({ lemma: 'Haus', gloss: 'house' });
    expect(lex.still).toBeUndefined();
  });
});

describe('the built dictionary (public/dict/de-en.json)', () => {
  const file: DictFile = JSON.parse(readFileSync(new URL('../public/dict/de-en.json', import.meta.url), 'utf8'));
  const index = indexDictionary(file);
  const first = (w: string) => lexiconFrom(index, [w])[w]?.candidates?.[0];

  it('matches the version the app expects', () => {
    expect(file.v).toBe(dictVersion.version);
  });

  it('puts the true headword first for common forms', () => {
    expect(first('sie')).toMatchObject({ lemma: 'sie', pos: 'pron' });
    expect(first('gedanken')).toMatchObject({ lemma: 'Gedanke', pos: 'noun' });
    expect(first('ging')?.lemma).toBe('gehen');
    expect(first('war')?.lemma).toBe('sein');
    expect(first('geworden')?.lemma).toBe('werden');
  });

  it('has no stray brackets or trailing punctuation in glosses', () => {
    const bad = file.e.filter(([, , , g]) => /[()[\]{}]|[\s'"‘’“”,;:.]$|^\s/.test(g) && !/\(pl\.\)$/.test(g));
    expect(bad.slice(0, 5)).toEqual([]);
  });

  it('glosses have at most two meanings', () => {
    expect(file.e.filter(([, , , g]) => g.split(' / ').length > 2).slice(0, 5)).toEqual([]);
  });
});
