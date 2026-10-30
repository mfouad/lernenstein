import type { CSSProperties } from 'react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { shortGloss } from '../lib/gloss.ts';
import { POS_INFO, UNDERLINE } from '../lib/grammar.ts';
import { useSettings } from '../store/settings.ts';
import { usePlayback } from '../store/playback.ts';
import type { AnalyzedSong, Pos } from '../types.ts';
import { LineTranslation } from './LineTranslation.tsx';
import { ChunkStrip } from './ChunkStrip.tsx';

// The big words shrink in steps until the line fits: on one row if that's
// possible above ONE_ROW_PX, otherwise no taller than FIT_HEIGHT, and never
// wider than the card.
const MAX_PX = 56;
const ONE_ROW_PX = 36;
const MIN_PX = 24;
const STEP_PX = 4;
const FIT_HEIGHT = 280;

// Measures the strip's own items, not scrollWidth: the hidden hover buttons on
// the last word stick out past the edge and would always count as overflow.
function needsShrink(el: HTMLElement, px: number): boolean {
  const strip = el.firstElementChild as HTMLElement | null;
  if (!strip) return false;
  const items = [...strip.children] as HTMLElement[];
  const right = el.getBoundingClientRect().right;
  const wide = items.some((i) => i.getBoundingClientRect().right > right + 1);
  const wraps = items.length > 1 && items[items.length - 1].offsetTop > items[0].offsetTop + 4;
  return wide || strip.offsetHeight > FIT_HEIGHT || (wraps && px > ONE_ROW_PX);
}

export function FullLine({ song }: { song: AnalyzedSong }) {
  const { active, pass, goTo } = usePlayback();
  const { repeat, learned, hideGrammar, hideTranslation, chunks, gstyle } = useSettings();
  const fitRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [px, setPx] = useState(MAX_PX);
  useEffect(() => {
    const el = fitRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useLayoutEffect(() => { setPx(MAX_PX); }, [song, active, chunks, gstyle, hideGrammar, hideTranslation, learned, width]);
  useLayoutEffect(() => {
    const el = fitRef.current;
    if (el && px > MIN_PX && needsShrink(el, px)) {
      setPx(Math.max(MIN_PX, px - STEP_PX));
    }
  });

  const line = song.lines[active];
  if (!line) return null;
  const prev = song.lines[active - 1];
  const next = song.lines[active + 1];
  const q = line.question;
  const showQ = q && !hideGrammar && learned.includes(q === 'w' ? 'wQuestion' : 'ynQuestion');

  return (
    <section className="flex min-h-[640px] flex-col rounded-2xl border border-line bg-surface px-6 pb-6 pt-7 md:px-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="eyebrow">Full line</span>
          {showQ && (
            <span className="flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 pl-1 text-xs font-semibold"
              style={{ borderColor: `var(--slot-${q === 'w' ? 1 : 2})`, color: `var(--slot-${q === 'w' ? 1 : 2})` }}>
              <span className="grid size-[18px] place-items-center rounded-full text-[11px] font-extrabold text-on" style={{ background: `var(--slot-${q === 'w' ? 1 : 2})` }}>?</span>
              {q === 'w' ? 'W-Frage · question word, then verb' : 'Ja/Nein-Frage · verb first'}
            </span>
          )}
        </div>
        <span className="font-mono text-xs text-faint">
          Line {active + 1} / {song.lines.length}
          {repeat > 0 && <span className="text-accent"> · pass {pass + 1} of {repeat + 1}</span>}
          {line.time != null && ` · ${fmt(line.time)}`}
        </span>
      </div>
      <LineTranslation text={line.text} given={line.translation} fallback={line.tokens.filter((t) => t.gloss).map((t) => shortGloss(t.gloss, t.pos)).join(' · ')} />

      <p className="mt-8 min-h-6 text-[15px] font-semibold text-faint">
        {prev && <><span className="mr-2.5 font-mono text-[10px] tracking-widest">PREV</span>{prev.text}</>}
      </p>
      <div className="flex flex-1 items-center py-10">
        <div ref={fitRef} className="w-full min-w-0" style={{ '--word-size': `${px}px` } as CSSProperties}>
          <ChunkStrip key={active} tokens={line.tokens} size="lg" />
        </div>
      </div>
      <p className="mb-5 min-h-6 text-[15px] font-semibold text-faint">
        {next && <><span className="mr-2.5 font-mono text-[10px] tracking-widest">NEXT</span>{next.text}</>}
      </p>

      <div className="mb-4 flex items-center gap-[3px]" aria-label={`Song progress, line ${active + 1} of ${song.lines.length}`}>
        {song.lines.map((l, i) => (
          <button key={i} type="button" aria-label={`Go to line ${i + 1}`} onClick={() => goTo(i, l.time)}
            className={`flex-1 cursor-pointer rounded-sm ${i === active ? 'h-2 bg-accent' : i < active ? 'h-1 bg-line2' : 'h-1 bg-line'}`} />
        ))}
      </div>
      <Legend pos={[...new Set(line.tokens.map((t) => t.pos))]} />
    </section>
  );
}

function Legend({ pos }: { pos: Pos[] }) {
  const { gstyle, hideGrammar } = useSettings();
  if (hideGrammar) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5 border-t border-line pt-4 text-[13px] text-muted">
      <span className="font-mono text-[10px] font-bold tracking-[0.14em] text-faint">GRAMMAR</span>
      {pos.map((p) => (
        <span key={p} className="flex items-center gap-2" style={{ '--c': `var(--pos-${p})` } as CSSProperties}>
          {gstyle === 'chips'
            ? <span className="rounded-full bg-(--c) px-2 font-mono text-[10px] font-bold text-on">{POS_INFO[p].abbr}</span>
            : <span className={`font-extrabold ${gstyle === 'color' ? 'text-(--c)' : ''}`}
              style={gstyle === 'underline' && UNDERLINE[p] ? { textDecorationLine: 'underline', textDecorationStyle: UNDERLINE[p] as CSSProperties['textDecorationStyle'], textDecorationColor: 'var(--c)', textDecorationThickness: 2, textUnderlineOffset: 4 } : undefined}>Aa</span>}
          {POS_INFO[p].name}
        </span>
      ))}
    </div>
  );
}

export const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
