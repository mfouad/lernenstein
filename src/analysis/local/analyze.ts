import type { AnalyzedLine, AnalyzedSong, QuestionKind, RawLine, Token } from '../../types.ts';
import { assignSlots, sentences, type FieldWord } from './fields.ts';
import { addForms } from './forms.ts';
import { lookup, type Lexicon } from './lexicon.ts';
import { tokenizeLine } from './tokenize.ts';

// On-device analysis: tokens, parts of speech, slots, questions and forms.
// Works on the whole song so sentences that span lines get the right slots.
export function analyzeLocal(slug: string, lines: RawLine[], lex: Lexicon): AnalyzedSong {
  const tokenLines = lines.map((l, i) => tokenizeLine(l.text, i));

  const words: (FieldWord & { token: Token; elided: boolean })[] = [];
  tokenLines.forEach((toks) => {
    let first = true;
    toks.forEach((rt) => {
      if (rt.kind !== 'word') {
        const prev = words[words.length - 1];
        if (prev && prev.line === rt.line) prev.after += rt.text;
        return;
      }
      const entry = lookup(rt.norm, rt.text, lex, first);
      first = false;
      const token: Token = {
        text: rt.text,
        lemma: entry.lemma,
        pos: entry.pos,
        slot: 3,
        clause: 0,
        clauseType: 'main',
        forms: [],
        gloss: rt.clitic ? `${entry.gloss} + it` : entry.gloss,
      };
      words.push({ norm: rt.norm, pos: entry.pos, line: rt.line, after: '', token, elided: !!rt.elided });
    });
  });

  const startsLower = (line: number) => /^\p{Ll}/u.test(lines[line]?.text.trim() ?? '');
  const questionByLine = new Map<number, QuestionKind>();
  let clauseId = 0;
  for (const s of sentences(words, startsLower)) {
    const q = assignSlots(s, () => clauseId++);
    if (q) s.forEach((w) => questionByLine.set(w.line, q));
  }

  const elided = new Set<Token>();
  for (const w of words) {
    w.token.slot = w.slot ?? 3;
    w.token.clause = w.clause ?? 0;
    w.token.clauseType = w.clauseType ?? 'main';
    if (w.elided) elided.add(w.token);
  }

  const out: AnalyzedLine[] = lines.map((l, i) => {
    const tokens = words.filter((w) => w.line === i).map((w) => w.token);
    // Clause ids become 0, 1, … within the line.
    const ids = [...new Set(tokens.map((t) => t.clause))];
    tokens.forEach((t) => { t.clause = ids.indexOf(t.clause); });
    const question = questionByLine.get(i) ?? null;
    addForms(tokens, question, elided);
    return { ...l, tokens, question };
  });

  return { slug, engine: 'local', lines: out };
}
