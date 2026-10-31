import { chunkClause, type Chunk } from '../lib/chunks.ts';
import { useSettings } from '../store/settings.ts';
import type { Token } from '../types.ts';
import { Word } from './Word.tsx';

type Size = 'sm' | 'lg';
// Large strips set their font size to the word size so em spacing follows it.
const EM = { fontSize: 'var(--word-size, 3.75rem)' };

// A line's words in German order. With chunks on, they're grouped into boxes
// (subject outlined, verb filled) and a line runs under the sentence from the
// verb to its partner at the end (the verb bracket). Used by both views.
// The large size scales with --word-size: spacing is in em of that size.
export function ChunkStrip({ tokens, size, blank, center }: { tokens: Token[]; size: Size; blank?: Token; center?: boolean }) {
  const { chunks, hideGrammar, gstyle } = useSettings();
  const big = size === 'lg';
  if (!chunks || hideGrammar || gstyle === 'plain') {
    return (
      <div className={`flex flex-wrap items-start ${center ? 'justify-center' : ''} ${big ? 'gap-x-[0.7em] gap-y-[0.35em]' : 'gap-x-2.5 gap-y-2'}`} style={big ? EM : undefined}>
        {tokens.map((t, i) => <Word key={i} token={t} size={size} blank={t === blank} />)}
      </div>
    );
  }
  const clauseIds = [...new Set(tokens.map((t) => t.clause))];
  return (
    <div className={`flex flex-wrap items-end ${center ? 'justify-center' : ''} ${big ? 'gap-y-[0.3em]' : 'gap-y-2'}`} style={big ? EM : undefined}>
      {clauseIds.map((cid, ci) => chunkClause(tokens.filter((t) => t.clause === cid)).map((c, k) => (
        <ChunkView key={`${cid}-${k}`} chunk={c} size={size} blank={blank} gapBefore={ci > 0 && k === 0} />
      )))}
    </div>
  );
}

function ChunkView({ chunk, size, blank, gapBefore }: { chunk: Chunk; size: Size; blank?: Token; gapBefore: boolean }) {
  const { kind, bracket } = chunk;
  const big = size === 'lg';
  const pad = big ? 'rounded-2xl border-2 px-[0.3em] py-[0.15em]' : 'rounded-lg border px-2 py-1';
  // A connector that opens the verb bracket (weil, dass…) is the verb's first part, so it gets the verb box.
  const box = kind === 'link' ? (bracket ? `${pad} border-(--slot-2) bg-(--lane)` : '')
    : kind === 'verb' || kind === 'verbEnd' ? `${pad} border-(--slot-2) bg-(--lane)`
      : kind === 'subject' ? `${pad} border-(--slot-1)`
        : `${pad} border-line`;
  return (
    <div className={`relative ${big ? 'px-[0.12em] pb-[max(1rem,0.4em)]' : 'px-1 pb-3'} ${gapBefore ? (big ? 'ml-[0.6em]' : 'ml-5') : ''}`}>
      <div className={`flex flex-wrap ${big ? 'gap-x-[0.45em] gap-y-[0.25em]' : 'gap-x-2.5'} ${box}`}>
        {chunk.tokens.map((t, i) => <Word key={i} token={t} size={size} blank={t === blank} />)}
      </div>
      {bracket && <Bracket part={bracket} big={big} />}
    </div>
  );
}

// One piece of the line under the verb bracket; the ends turn up into the verb chunks.
function Bracket({ part, big }: { part: NonNullable<Chunk['bracket']>; big: boolean }) {
  const span = part === 'start' ? 'left-1/2 right-0' : part === 'end' ? 'left-0 right-1/2' : 'left-0 right-0';
  const line = big ? 'bottom-2 h-1' : 'bottom-1 h-0.5';
  return (
    <>
      <span className={`absolute bg-(--slot-2) ${line} ${span}`} />
      {part !== 'middle' && <span className={`absolute left-1/2 -translate-x-1/2 bg-(--slot-2) ${big ? 'bottom-2 h-4 w-1' : 'bottom-1 h-2 w-0.5'}`} />}
    </>
  );
}
