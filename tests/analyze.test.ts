import { describe, expect, it } from 'vitest';
import { analyzeLocal } from '../src/analysis/local/analyze.ts';
import type { Lexicon } from '../src/analysis/local/lexicon.ts';

// Invented sentences only (see CLAUDE.md): never real song lines.
const lex: Lexicon = Object.fromEntries(
  ([
    ['wohnst', 'verb', 'wohnen', 'live'], ['machst', 'verb', 'machen', 'do'], ['kommst', 'verb', 'kommen', 'come'],
    ['kommt', 'verb', 'kommen', 'comes'], ['heute', 'adv', 'heute', 'today'], ['morgen', 'adv', 'morgen', 'tomorrow'],
    ['glaube', 'verb', 'glauben', 'believe'], ['gehe', 'verb', 'gehen', 'go'], ['park', 'noun', 'Park', 'park'],
    ['berlin', 'name', 'Berlin', 'Berlin'], ['lesen', 'verb', 'lesen', 'read'], ['buch', 'noun', 'Buch', 'book'],
    ['gegessen', 'verb', 'essen', 'eaten'], ['brot', 'noun', 'Brot', 'bread'], ['schnell', 'adj', 'schnell', 'fast'],
    ['läuft', 'verb', 'laufen', 'runs'], ['hund', 'noun', 'Hund', 'dog'],
  ] as const).map(([w, pos, lemma, gloss]) => [w, { claude: gloss, wiktionary: { lemma, pos, gloss } }]),
);

const run = (...lines: string[]) => analyzeLocal('test', lines.map((text) => ({ time: null, text })), lex).lines;
const slots = (line: { tokens: { text: string; slot: number }[] }) => line.tokens.map((t) => `${t.text}:${t.slot}`).join(' ');
const forms = (line: { tokens: { text: string; forms: string[] }[] }, word: string) => line.tokens.find((t) => t.text === word)!.forms;

describe('slots', () => {
  it('statement: subject, verb second, middle field', () => {
    expect(slots(run('Ich gehe heute in den Park.')[0])).toBe('Ich:1 gehe:2 heute:3 in:3 den:3 Park:3');
  });

  it('W-question: question word in slot 1, verb in slot 2', () => {
    const [l] = run('Wo wohnst du?');
    expect(slots(l)).toBe('Wo:1 wohnst:2 du:3');
    expect(l.question).toBe('w');
    expect(forms(l, 'Wo')).toContain('wQuestion');
  });

  it('yes/no question: verb first, separable prefix at the end', () => {
    const [l] = run('Kommst du heute mit?');
    expect(slots(l)).toBe('Kommst:2 du:3 heute:3 mit:4');
    expect(l.question).toBe('yn');
    expect(forms(l, 'Kommst')).toEqual(expect.arrayContaining(['ynQuestion', 'separable', 'present']));
    expect(forms(l, 'mit')).toContain('separable');
  });

  it('subordinate clause sends the verb to the end', () => {
    const [l] = run('Ich glaube, dass er morgen kommt.');
    expect(slots(l)).toBe('Ich:1 glaube:2 dass:2 er:3 morgen:3 kommt:4');
    expect(l.tokens.find((t) => t.text === 'kommt')!.clauseType).toBe('sub');
    expect(forms(l, 'kommt')).toContain('verbFinal');
  });

  it('modal verb brackets the infinitive', () => {
    const [l] = run('Du kannst das Buch lesen.');
    expect(slots(l)).toBe('Du:1 kannst:2 das:3 Buch:3 lesen:4');
    expect(forms(l, 'lesen')).toContain('modal');
  });

  it('perfect tense: auxiliary second, participle at the end', () => {
    const [l] = run('Ich habe das Brot gegessen.');
    expect(forms(l, 'gegessen')).toContain('perfect');
  });

  it('comparison after the bracket goes to slot 5', () => {
    expect(slots(run('Der Hund läuft schnell wie der Wind.')[0])).toContain('wie:5');
  });

  it('a sentence can continue on the next line', () => {
    const lines = run('Morgen kommst du', 'zu mir.');
    expect(slots(lines[0])).toBe('Morgen:1 kommst:2 du:3');
    expect(lines[1].tokens.every((t) => t.slot === 3)).toBe(true);
  });
});

describe('forms', () => {
  it('kein and dative/accusative cues', () => {
    const [l] = run('Ich gehe mit dir ohne mich.');
    expect(forms(l, 'mit')).toContain('dat');
    expect(forms(l, 'dir')).toContain('dat');
    expect(forms(l, 'mich')).toContain('acc');
    expect(forms(run('Kein Hund läuft.')[0], 'Kein')).toContain('kein');
  });

  it('contraction keeps the clitic in the gloss', () => {
    const [l] = run("Wenn's regnet, gehe ich.");
    expect(l.tokens[0].gloss).toContain('+ it');
  });
});
