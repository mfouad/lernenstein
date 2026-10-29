import type { CSSProperties } from 'react';
import { useEffect, useRef } from 'react';
import { SLOT_INFO } from '../lib/grammar.ts';
import { usePlayback } from '../store/playback.ts';
import { useSettings } from '../store/settings.ts';
import type { AnalyzedSong, Slot, Token } from '../types.ts';
import { fmt } from './FullLine.tsx';
import { Word } from './Word.tsx';

const SLOTS: Slot[] = [0, 1, 2, 3, 4, 5];
const GRID = 'grid grid-cols-[64px_repeat(6,minmax(0,1fr))]';

export function LyricsTable({ song }: { song: AnalyzedSong }) {
  const { active, goTo } = usePlayback();
  const { learned, hideGrammar } = useSettings();
  const activeRef = useRef<HTMLDivElement>(null);
  useEffect(() => { activeRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, [active]);

  return (
    <section className="rounded-2xl border border-line bg-surface px-6 pb-3 pt-6">
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
        <span className="eyebrow">Lyrics table</span>
        <span className="text-[13px] text-muted">Every line in the same six slots · click a line to play it</span>
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[880px]">
          <div className={`${GRID} border-b border-line`}>
            <span />
            {SLOTS.map((s) => (
              <span key={s} className="flex items-center gap-2 px-3 pb-2.5 font-mono text-[11px] font-bold uppercase tracking-wider" style={{ color: `var(--slot-${s})` }}>
                <span className="grid size-5 place-items-center rounded-full text-on" style={{ background: `var(--slot-${s})` }}>{SLOT_INFO[s].mark}</span>
                {SLOT_INFO[s].name}
              </span>
            ))}
          </div>
          {song.lines.map((line, li) => {
            const clauseIds = [...new Set(line.tokens.map((t) => t.clause))];
            const isActive = li === active;
            const q = line.question && !hideGrammar && learned.includes(line.question === 'w' ? 'wQuestion' : 'ynQuestion') ? line.question : null;
            return (
              <div key={li} ref={isActive ? activeRef : undefined} onClick={() => goTo(li, line.time)}
                className={`cursor-pointer border-b border-line py-1.5 ${isActive ? 'rounded-xl bg-surface2 shadow-[inset_3px_0_0_var(--accent)]' : ''}`}>
                {clauseIds.map((cid, ci) => {
                  const tokens = line.tokens.filter((t) => t.clause === cid);
                  const sub = tokens[0]?.clauseType === 'sub';
                  return (
                    <div key={cid} className={GRID}>
                      <span className="flex flex-col items-start gap-1 pl-3 pt-2">
                        <span className="font-mono text-[11px] text-faint">{ci === 0 && line.time != null ? fmt(line.time) : ''}</span>
                        {sub && <Tag color="var(--pos-MOD)" outline>SUB</Tag>}
                        {ci === 0 && q && <Tag color={`var(--slot-${q === 'w' ? 1 : 2})`}>{q === 'w' ? 'W-?' : 'JA/NEIN?'}</Tag>}
                      </span>
                      {SLOTS.map((s) => <Cell key={s} slot={s} tokens={tokens.filter((t) => t.slot === s)} />)}
                    </div>
                  );
                })}
                {line.tokens.length === 0 && <div className="pl-[76px] text-sm text-faint">{line.text}</div>}
                {line.translation && <div className="pl-[76px] pt-0.5 text-[13px] text-muted">{line.translation}</div>}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Cell({ slot, tokens }: { slot: Slot; tokens: Token[] }) {
  return (
    <div className="flex min-h-11 flex-wrap gap-x-3 gap-y-1 border-l border-dashed border-line px-3 py-1.5"
      style={{ background: slot === 2 || slot === 4 ? 'var(--lane)' : undefined }}>
      {tokens.map((t, i) => <Word key={i} token={t} size="sm" />)}
    </div>
  );
}

function Tag({ color, outline, children }: { color: string; outline?: boolean; children: React.ReactNode }) {
  return (
    <span className="rounded-full px-1.5 font-mono text-[9px] font-bold tracking-wide"
      style={(outline ? { border: `1px solid ${color}`, color } : { background: color, color: 'var(--on)' }) as CSSProperties}>
      {children}
    </span>
  );
}
