import { describe, expect, it } from 'vitest';
import { chunkClause } from '../src/lib/chunks.ts';
import type { Pos, Slot, Token } from '../src/types.ts';

// Invented sentences only (see CLAUDE.md). Each word is text:pos:slot.
const clause = (spec: string, clauseType: 'main' | 'sub' = 'main'): Token[] =>
  spec.split(' ').map((w) => {
    const [text, pos, slot] = w.split(':');
    return { text, lemma: text, pos: pos as Pos, slot: Number(slot) as Slot, clause: 0, clauseType, forms: [], gloss: '' };
  });

const show = (tokens: Token[]) =>
  chunkClause(tokens).map((c) => `${c.kind}${c.bracket ? `(${c.bracket})` : ''}[${c.tokens.map((t) => t.text).join(' ')}]`).join(' ');

describe('chunkClause', () => {
  it('keeps prepositions with their phrase and finds the subject after the verb', () => {
    expect(show(clause('Heute:ADV:1 gehe:V:2 ich:PRON:3 mit:PREP:3 Anna:N:3 in:PREP:3 den:DET:3 Park:N:3')))
      .toBe('phrase[Heute] verb[gehe] subject[ich] phrase[mit Anna] phrase[in den Park]');
  });

  it('draws the bracket from the modal to the infinitive', () => {
    expect(show(clause('Morgen:ADV:1 kann:MOD:2 ich:PRON:3 nicht:ADV:3 ins:PREP:3 Kino:N:3 gehen:V:4')))
      .toBe('phrase[Morgen] verb(start)[kann] subject(middle)[ich] phrase(middle)[nicht] phrase(middle)[ins Kino] verbEnd(end)[gehen]');
  });

  it('opens a sub clause bracket at the connector', () => {
    expect(show(clause('weil:CONN:2 ich:PRON:3 müde:ADJ:3 bin:AUX:4', 'sub')))
      .toBe('link(start)[weil] subject(middle)[ich] phrase(middle)[müde] verbEnd(end)[bin]');
  });

  it('keeps "und" between two nouns inside one chunk', () => {
    expect(show(clause('Ich:PRON:1 esse:V:2 Brot:N:3 und:CONN:3 Butter:N:3')))
      .toBe('subject[Ich] verb[esse] phrase[Brot und Butter]');
  });

  it('a fronted place phrase stays one chunk before the verb', () => {
    expect(show(clause('In:PREP:1 meinem:DET:1 Garten:N:1 steht:V:2 ein:DET:3 Baum:N:3')))
      .toBe('phrase[In meinem Garten] verb[steht] subject[ein Baum]');
  });
});
