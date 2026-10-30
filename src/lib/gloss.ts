import type { Pos } from '../types.ts';

const VERBS: Pos[] = ['V', 'MOD', 'AUX'];
const firstAlt = (s: string) => s.split(/\s*\/\s*/)[0].trim();

// One short meaning for display under a word: the first of "a / b" options,
// without notes in brackets, and without "to" on verbs ("to give" → "give").
// The full gloss stays in the word's hover card.
export function shortGloss(gloss: string, pos: Pos): string {
  const clitic = / \+ it$/.test(gloss) ? ' + it' : '';
  const base = gloss.replace(/ \+ it$/, '');
  let g = firstAlt(base.replace(/\s*\([^)]*\)/g, '')) || firstAlt(base);
  if (VERBS.includes(pos)) g = g.replace(/^to\s+/, '');
  return g + clitic;
}

// The same for a whole line: "(gave/there was)" → "gave", "(to me)" → "me",
// notes like "(pl.)" are dropped, and "a / b" outside brackets keeps "a".
export function shortTranslation(text: string): string {
  return text
    .replace(/\s*\(([^)]*)\)/g, (_, inner: string) => {
      if (inner.includes('/')) return ` ${firstAlt(inner)}`;
      if (/^to\s/.test(inner)) return ` ${inner.replace(/^to\s+/, '')}`;
      return '';
    })
    .replace(/([^\s/]+)(?:\s*\/\s*[^\s/]+)+/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}
