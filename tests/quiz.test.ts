import { describe, expect, it } from 'vitest';
import { buildQuiz, quizWords } from '../src/lib/quiz.ts';
import type { AnalyzedSong, Pos, Token } from '../src/types.ts';

// Invented words only (see CLAUDE.md). Each word is text:pos:lemma.
const tok = (spec: string): Token => {
  const [text, pos, lemma = text.toLowerCase()] = spec.split(':');
  return { text, lemma, pos: pos as Pos, slot: 3, clause: 0, clauseType: 'main', forms: [], gloss: 'x' };
};
const song = (lines: string[]): AnalyzedSong => ({
  slug: 'demo', engine: 'local',
  lines: lines.map((l) => ({ time: null, text: l, tokens: l.split(' ').map(tok), question: null })),
});

const nouns = 'Hund Katze Baum Haus Tisch Stuhl Buch Brot Fisch Vogel'.split(' ').map((n) => `${n}:N`);
const verbs = 'laufen springen essen trinken lesen malen singen tanzen kochen warten'.split(' ').map((v) => `${v}:V`);

describe('quiz words', () => {
  const s = song([
    `Ich:PRON:ich ${nouns.slice(0, 5).join(' ')} und:CONN`,
    `${verbs.slice(0, 5).join(' ')} wir:PRON auf:PREP`,
    `${nouns.slice(5).join(' ')} ${verbs.slice(5).join(' ')}`,
  ]);

  it('follows the 40/40/10/10 split, with no cap on the size', () => {
    const kinds = [...quizWords(s).values()].map((e) => e.kind);
    const n = (k: string) => kinds.filter((x) => x === k).length;
    expect([n('noun'), n('verb'), n('pronoun'), n('link')]).toEqual([10, 10, 2, 2]);
  });

  it('skips untranslated words, apostrophes, hyphens and other types', () => {
    const odd = song([
      `geht's:V Haus-Tür:N Wort:N ${nouns.join(' ')} gut:ADJ`,
    ]);
    odd.lines[0].tokens.find((t) => t.text === 'Wort')!.gloss = '';
    const words = [...quizWords(odd).values()];
    expect(words.length).toBe(0); // no verbs, so the nouns can't make 40% of a list
    const labels = new Set(buildQuiz(odd).flatMap((q) => q?.options ?? []));
    expect([...labels].some((l) => /['-]/.test(l) || l === 'Wort' || l === 'gut')).toBe(false);
  });
});

describe('buildQuiz', () => {
  const s = song([
    `Ich:PRON:ich ${nouns.slice(0, 5).join(' ')} und:CONN`,
    `${verbs.slice(0, 5).join(' ')} wir:PRON auf:PREP`,
    `${nouns.slice(5).join(' ')} ${verbs.slice(5).join(' ')}`,
  ]);
  const quiz = buildQuiz(s);

  it('hides one word per line with 3-4 options that include it', () => {
    for (const [i, q] of quiz.entries()) {
      expect(q).not.toBeNull();
      expect(q!.options).toContain(q!.answer);
      expect(q!.options.length).toBeGreaterThanOrEqual(3);
      expect(q!.options.length).toBeLessThanOrEqual(4);
      expect(new Set(q!.options).size).toBe(q!.options.length);
      expect(s.lines[i].tokens[q!.index].text.toLowerCase()).toBe(q!.answer.toLowerCase());
    }
  });

  it('is stable between calls', () => {
    expect(buildQuiz(s)).toBe(quiz);
  });

  it('quizzes a line whose words are not in the list too', () => {
    const rare = song([...s.lines.map((l) => l.text), 'Zebra:N sehr:ADV', 'Giraffe:N sehr:ADV']);
    expect(buildQuiz(rare).every((q) => q && q.options.length >= 3)).toBe(true);
  });

  it('has no question for a one-word line', () => {
    expect(buildQuiz(song(['Haus:N', ...s.lines.map((l) => l.text)]))[0]).toBeNull();
  });

  it('has no question for a line without a quiz word', () => {
    const s2 = song([...s.lines.map((l) => l.text), 'schön:ADJ sehr:ADV']);
    expect(buildQuiz(s2).at(-1)).toBeNull();
  });
});

describe('quiz seed', () => {
  const s = song([
    `${nouns.slice(0, 5).join(' ')} ${verbs.slice(0, 5).join(' ')}`,
    `${nouns.slice(5).join(' ')} ${verbs.slice(5).join(' ')}`,
  ]);
  const sig = (seed?: number) => JSON.stringify(buildQuiz(s, seed));

  it('is stable for a seed and varies between seeds', () => {
    expect(sig(1)).toBe(sig(1));
    expect(new Set([1, 2, 3, 4, 5].map(sig)).size).toBeGreaterThan(1);
  });

  it('keeps the same quiz for a loaded song when no seed is given', () => {
    expect(JSON.stringify(buildQuiz(s))).toBe(JSON.stringify(buildQuiz(s)));
  });
});

describe('repeated lines', () => {
  it('hide different words when the line comes back', () => {
    const line = `${nouns.slice(0, 3).join(' ')} ${verbs.slice(0, 3).join(' ')}`;
    const rest = `${nouns.slice(3).join(' ')} ${verbs.slice(3).join(' ')}`;
    const s = song([line, rest, line, line]);
    for (const seed of [1, 2, 3]) {
      const q = buildQuiz(s, seed);
      const a = [0, 2, 3].map((i) => q[i]!.answer);
      expect(new Set(a).size).toBe(3);
    }
  });
});
