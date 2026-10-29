import type { CSSProperties } from 'react';
import { POS_INFO, SLOT_INFO, UNDERLINE } from '../lib/grammar.ts';
import { useSettings } from '../store/settings.ts';
import { usePlayback } from '../store/playback.ts';
import type { AnalyzedSong, Pos } from '../types.ts';
import { LineTranslation } from './LineTranslation.tsx';
import { Word } from './Word.tsx';

export function FullLine({ song }: { song: AnalyzedSong }) {
  const { active, pass, goTo } = usePlayback();
  const { repeat, learned, hideGrammar } = useSettings();
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
      <LineTranslation text={line.text} given={line.translation} fallback={line.tokens.map((t) => t.gloss).filter(Boolean).join(' · ')} />

      <p className="mt-8 min-h-6 text-[15px] font-semibold text-faint">
        {prev && <><span className="mr-2.5 font-mono text-[10px] tracking-widest">PREV</span>{prev.text}</>}
      </p>
      <div className="flex flex-1 flex-wrap content-center items-start gap-x-11 gap-y-6 py-10">
        {line.tokens.map((t, i) => <Word key={`${active}-${i}`} token={t} size="lg" />)}
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
  const slots = gstyle === 'slots';
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5 border-t border-line pt-4 text-[13px] text-muted">
      <span className="font-mono text-[10px] font-bold tracking-[0.14em] text-faint">{slots ? 'SLOTS' : 'GRAMMAR'}</span>
      {slots
        ? ([1, 2, 3, 4, 5] as const).map((n) => (
          <span key={n} className="flex items-center gap-2" style={{ '--s': `var(--slot-${n})` } as CSSProperties}>
            <span className="grid size-5 place-items-center rounded-full border-2 border-(--s) font-mono text-[11px] font-bold text-(--s)">{n}</span>
            {SLOT_INFO[n].name}
          </span>
        ))
        : pos.map((p) => (
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
