// Pure helpers for scripts/build-dict.ts, kept apart so tests can import them.

const OPEN: Record<string, string> = { '(': ')', '[': ']', '{': '}' };
const CLOSE = new Set(Object.values(OPEN));
const EDGE_JUNK = /^[\s'"‘’‚“”„«»‹›.,:;!?…\-–—/]+|[\s'"‘’‚“”„«»‹›.,:;!?…\-–—/]+$/g;

const DANGLING = /(?:\s+(?:a|an|the|and|or|of|to|for|with|in|on|at|by|from|as|such|one|that|which|who|usually|especially))+$/i;

// Drops bracketed asides, nested or not. An unclosed bracket drops the rest
// of the text; a stray closing bracket is dropped on its own.
export function stripBrackets(s: string): string {
  let out = '';
  const stack: string[] = [];
  for (const ch of s) {
    if (OPEN[ch]) stack.push(OPEN[ch]);
    else if (CLOSE.has(ch)) {
      if (stack.length && stack[stack.length - 1] === ch) stack.pop();
      // A mismatched closer inside an aside is ignored; outside it is dropped.
    } else if (!stack.length) out += ch;
  }
  return out;
}

// One short meaning out of a Wiktionary gloss, or '' if nothing useful is left.
export function cleanGloss(g: string, max = 40): string {
  let s = stripBrackets(g).split(';')[0];
  // " / " separates meanings in the output, so a slash inside one becomes a comma.
  s = s.replace(/\s+\/\s+/g, ', ').replace(/\s+/g, ' ').replace(/\s+([,.:!?])/g, '$1').replace(EDGE_JUNK, '').trim();
  if (s.length > max) {
    // Cut at the last comma before the limit, else at a word boundary, and
    // drop a dangling little word ("made of stone or").
    const cut = s.slice(0, max + 1);
    const at = cut.lastIndexOf(',') > 3 ? cut.lastIndexOf(',') : cut.lastIndexOf(' ');
    s = cut.slice(0, at > 0 ? at : max).replace(DANGLING, '').replace(EDGE_JUNK, '');
  }
  return s;
}

// Senses that only point at another word ("dative of sie", "obsolete spelling
// of dass") or introduce sub-senses ("As a copulative verb:").
// Also grammar descriptions ("nominative masculine singular definite article",
// "forms the present perfect …") that say nothing a learner can use as a gloss.
export function isPointerGloss(g: string): boolean {
  return /:\s*$/.test(g)
    || /^(?:\w+ )*(?:spelling|form|misspelling|abbreviation|contraction|clipping) of\b/i.test(g)
    || /\b(?:singular|plural|nominative|accusative|dative|genitive|participle|preterite|imperative|inflection)\b[^,;]* of \S+$/i.test(g)
    || /^(?:(?:first|second|third|nominative|accusative|dative|genitive|masculine|feminine|neuter|singular|plural)\b[\s/-]*){2,}/i.test(g)
    || /^forms the\b/i.test(g);
}

// Up to two short meanings joined with " / ". Only the first may be shortened;
// a later one that doesn't fit is left out rather than cut mid-phrase.
export function joinGlosses(raw: string[], meanings = 2, max = 40): string {
  const out: string[] = [];
  for (const g of raw) {
    if (isPointerGloss(g)) continue;
    // Parts an earlier meaning already gave are dropped ("park / park, grounds" → "park / grounds").
    const seen = new Set(out.flatMap((m) => m.split(', ')));
    const c = cleanGloss(g, max).split(', ').filter((p) => !seen.has(p)).join(', ');
    if (!c || isPointerGloss(c)) continue;
    if (out.length && cleanGloss(g, Infinity).length > max) continue;
    out.push(c);
    if (out.length === meanings) break;
  }
  return out.join(' / ');
}

// Entries whose headword is the form itself come first, then inflections;
// proper names (the town "Mauern" vs the noun Mauer) go after both. One
// exception: a verb's past participle beats an adjective headword of the same
// spelling ("geworden"), since the perfect and passive depend on it. File order
// within each group. The limit never cuts off a (non-name) headword.
export interface FormReading { lemma: string; pos: string; pastParticiple?: boolean }

export function orderForForm(form: string, ids: number[], readingOf: (id: number) => FormReading, max: number): number[] {
  const key = form.toLowerCase();
  const rank = (id: number) => {
    const { lemma, pos, pastParticiple } = readingOf(id);
    if (pastParticiple) return 0;
    return (pos === 'name' ? 3 : 1) + (lemma.toLowerCase() === key ? 0 : 1);
  };
  const ranked = ids.map((id) => [rank(id), id] as const).sort((a, b) => a[0] - b[0]);
  const heads = ranked.filter(([r]) => r <= 1).length;
  return ranked.slice(0, Math.max(max, heads)).map(([, id]) => id);
}
