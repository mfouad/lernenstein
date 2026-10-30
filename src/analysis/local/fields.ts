import type { Pos, QuestionKind, Slot } from '../../types.ts';
import { COORDINATORS, SEPARABLE_PARTICLES, SUBORDINATORS, W_WORDS } from './lexicon.ts';

// A word with its part of speech, ready for slot assignment.
export interface FieldWord {
  norm: string;
  pos: Pos;
  line: number;
  // Punctuation right after the word (",", "?", …), if any.
  after: string;
  slot?: Slot;
  clause?: number;
  clauseType?: 'main' | 'sub';
}

const VERBISH: Pos[] = ['V', 'MOD', 'AUX'];
const isVerb = (w: FieldWord) => VERBISH.includes(w.pos);
const CLAUSE_BREAK = /[,;:–—-]/;
const SENTENCE_END = /[.!?;:]/;

// Splits words into sentences. A sentence may span lines: a line without
// end punctuation followed by a line starting in lowercase continues it.
export function sentences(words: FieldWord[], lineStartsLower: (line: number) => boolean): FieldWord[][] {
  const out: FieldWord[][] = [];
  let cur: FieldWord[] = [];
  words.forEach((w, i) => {
    cur.push(w);
    const next = words[i + 1];
    const endsHere = SENTENCE_END.test(w.after)
      || !next
      || (next.line !== w.line && !lineStartsLower(next.line));
    if (endsHere) { out.push(cur); cur = []; }
  });
  return out;
}

// "und/oder/sondern" opens a new clause when a verb follows right away (und kaufe…)
// or after one pronoun or adverb (und du kommst…, und dann…). Two nouns joined
// before a final verb (Brot und Wasser trinken) stay one clause. "aber", "denn"
// and "doch" are left out: mid-clause they are usually particles.
const CLAUSE_JOINERS = new Set(['und', 'oder', 'sondern']);
function opensClause(sentence: FieldWord[], i: number): boolean {
  const next = sentence[i + 1];
  const after = sentence[i + 2];
  if (!next) return false;
  return isVerb(next) || ((next.pos === 'PRON' || next.pos === 'ADV') && !!after && isVerb(after));
}

function clauses(sentence: FieldWord[]): FieldWord[][] {
  const out: FieldWord[][] = [];
  let cur: FieldWord[] = [];
  sentence.forEach((w, i) => {
    // A subordinator in the middle starts a new clause even without a comma.
    if (cur.length && SUBORDINATORS.has(w.norm) && !COORDINATORS.has(sentence[i - 1]?.norm ?? '')) {
      out.push(cur); cur = [];
    }
    if (cur.length && CLAUSE_JOINERS.has(w.norm) && cur.some(isVerb) && opensClause(sentence, i)) {
      out.push(cur); cur = [];
    }
    cur.push(w);
    if (CLAUSE_BREAK.test(w.after)) { out.push(cur); cur = []; }
  });
  if (cur.length) out.push(cur);
  return out;
}

function assignSub(c: FieldWord[], start: number) {
  c[start].slot = 2;
  let j = c.length - 1;
  while (j > start && isVerb(c[j])) { c[j].slot = 4; j--; }
  for (let k = start + 1; k <= j; k++) c[k].slot = 3;
}

// Returns the question kind if this is the sentence's first main clause.
function assignMain(c: FieldWord[], start: number, first: boolean): 'verb-first' | 'w-first' | null {
  const v = c.findIndex((w, k) => k >= start && isVerb(w));
  if (v < 0) {
    // A verbless comparison ("wie …", "als …") trails the previous clause.
    const trailing = c[start].norm === 'wie' || c[start].norm === 'als';
    for (let k = start; k < c.length; k++) c[k].slot = trailing ? 5 : first ? 1 : 3;
    return null;
  }
  for (let k = start; k < v; k++) c[k].slot = 1;
  c[v].slot = 2;
  const rest = c.slice(v + 1);
  let end = rest.findIndex((w) => w.norm === 'wie' || w.norm === 'als');
  if (end <= 0) end = rest.length;
  for (let k = end; k < rest.length; k++) rest[k].slot = 5;
  let j = end - 1;
  if (j >= 0 && SEPARABLE_PARTICLES.has(rest[j].norm) && !isVerb(rest[j])) { rest[j].slot = 4; j--; }
  while (j >= 0 && isVerb(rest[j])) { rest[j].slot = 4; j--; }
  for (let k = 0; k <= j; k++) rest[k].slot = 3;
  if (v === start) return 'verb-first';
  if (W_WORDS.has(c[start].norm) && v === start + 1) return 'w-first';
  return null;
}

// Assigns slots in place and returns the question kind per sentence.
export function assignSlots(sentence: FieldWord[], nextClause: () => number): QuestionKind {
  const isQuestion = sentence[sentence.length - 1].after.includes('?');
  let question: QuestionKind = null;
  clauses(sentence).forEach((c, ci) => {
    let start = 0;
    while (start < c.length && COORDINATORS.has(c[start].norm)) { c[start].slot = 0; start++; }
    if (start >= c.length) return;
    const lead = c[start];
    const endsInVerb = isVerb(c[c.length - 1]) && c.length - start > 1;
    const sub = SUBORDINATORS.has(lead.norm) || (ci > 0 && W_WORDS.has(lead.norm) && endsInVerb);
    const type = sub ? 'sub' : 'main';
    if (sub) assignSub(c, start);
    else {
      const kind = assignMain(c, start, ci === 0);
      if (ci === 0 && isQuestion) question = kind === 'verb-first' ? 'yn' : kind === 'w-first' ? 'w' : null;
    }
    const id = nextClause();
    for (const w of c) {
      w.clauseType = type;
      w.clause = id;
    }
  });
  return question;
}
