import type { Token } from '../types.ts';
import { subjectIndices } from './subject.ts';

// A clause read the way a fluent reader does: in German order, in chunks.
//   link     und, aber, weil, dass… (a sub clause's connector opens its bracket)
//   verb     the conjugated verb (slot 2 of a main clause)
//   verbEnd  the verb's partner at the end (slot 4): gehen, auf, gesehen…
//   subject  who does it (best guess)
//   phrase   everything else: a preposition stays with its noun (in den Park)
export type ChunkKind = 'link' | 'verb' | 'verbEnd' | 'subject' | 'phrase';

export interface Chunk {
  kind: ChunkKind;
  tokens: Token[];
  // The verb bracket runs from the verb (or a sub clause's connector) to its partner at the end.
  bracket?: 'start' | 'middle' | 'end';
}

// Words that can continue a noun phrase until its head (noun or pronoun) arrives.
const OPENERS = new Set(['PREP', 'DET', 'ADJ', 'NUM']);
const PHRASE = new Set(['DET', 'ADJ', 'N', 'PRON', 'NUM', 'X']);
const NOUN_JOINERS = new Set(['und', 'oder']);

export function chunkClause(tokens: Token[]): Chunk[] {
  const subj = subjectIndices(tokens);
  const chunks: Chunk[] = [];
  let open: Chunk | null = null; // a phrase still waiting for its head

  tokens.forEach((t, i) => {
    const prev = chunks[chunks.length - 1];
    const kind: ChunkKind = t.slot === 0 || (t.slot === 2 && t.clauseType === 'sub') ? 'link'
      : t.slot === 2 ? 'verb'
        : t.slot === 4 ? 'verbEnd'
          : subj.has(i) ? 'subject'
            : 'phrase';

    if (kind === 'phrase') {
      // "Brot und Butter": und/oder between two phrases keeps them in one chunk.
      if (prev?.kind === 'phrase' && !open && NOUN_JOINERS.has(t.text.toLowerCase()) && PHRASE.has(tokens[i + 1]?.pos)) {
        prev.tokens.push(t);
        open = prev;
        return;
      }
      if (open && PHRASE.has(t.pos)) {
        open.tokens.push(t);
        if (!OPENERS.has(t.pos)) open = null;
        return;
      }
      const c: Chunk = { kind, tokens: [t] };
      chunks.push(c);
      // A preposition, article or adjective (or "wie", "als") waits for the rest of its phrase.
      open = OPENERS.has(t.pos) || t.pos === 'CONN' ? c : null;
      return;
    }

    open = null;
    // Neighbouring words of the same kind share a chunk (mein Schatz, gesehen haben).
    if (prev?.kind === kind && kind !== 'link') prev.tokens.push(t);
    else chunks.push({ kind, tokens: [t] });
  });

  const start = chunks.findIndex((c) => c.tokens.some((t) => t.slot === 2));
  const end = chunks.map((c) => c.kind).lastIndexOf('verbEnd');
  if (start >= 0 && end > start) {
    for (let k = start; k <= end; k++) chunks[k].bracket = k === start ? 'start' : k === end ? 'end' : 'middle';
  }
  return chunks;
}
