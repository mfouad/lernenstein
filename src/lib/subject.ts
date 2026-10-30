import { ACC_PRONOUNS, DAT_PRONOUNS, W_WORDS } from '../analysis/local/lexicon.ts';
import type { Token } from '../types.ts';

// Articles that rule out the nominative: den Hund, dem Mann, einen Apfel…
const NOT_NOMINATIVE = new Set(['den', 'dem', 'des', 'einen', 'einem', 'eines', 'keinen', 'keinem', 'meinen', 'meinem', 'deinen', 'deinem']);
const NOUN_PARTS = new Set(['DET', 'ADJ', 'NUM']);

// Best guess at who does the action in a clause: the first pronoun or noun
// phrase, in text order, that can be a subject. That skips question words other
// than "wer" (was, wen), object pronouns (mich, dir, sich), phrases after a
// preposition and phrases with an accusative/dative article (den, dem…).
// Returns indices into `tokens`.
export function subjectIndices(tokens: Token[]): Set<number> {
  const open = (t: Token) => t.slot === 1 || t.slot === 3;
  const low = (t: Token) => t.text.toLowerCase();

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (!open(t)) continue;
    if (t.pos === 'PRON') {
      const w = low(t);
      if (w === 'wer' || !(W_WORDS.has(w) || ACC_PRONOUNS.has(w) || DAT_PRONOUNS.has(w) || w === 'sich')) return new Set([i]);
      continue;
    }
    if (t.pos !== 'N') continue;
    let start = i;
    while (start > 0 && open(tokens[start - 1]) && NOUN_PARTS.has(tokens[start - 1].pos)) start--;
    if (tokens[start - 1]?.pos === 'PREP') continue;
    const run = tokens.slice(start, i + 1);
    if (run.some((x) => NOT_NOMINATIVE.has(low(x)))) continue;
    return new Set(run.map((_, k) => start + k));
  }
  return new Set();
}
