import type { CSSProperties } from 'react';
import { useEffect, useRef } from 'react';
import { shortTranslation } from '../lib/gloss.ts';
import { usePlayback } from '../store/playback.ts';
import { useSettings } from '../store/settings.ts';
import type { AnalyzedSong } from '../types.ts';
import { fmt } from './FullLine.tsx';
import { ChunkStrip } from './ChunkStrip.tsx';

// Every line as a chunk strip (see ChunkStrip), with its translation below.
export function LyricsTable({ song }: { song: AnalyzedSong }) {
  const { active, goTo } = usePlayback();
  const { learned, hideGrammar, chunks, gstyle } = useSettings();
  const activeRef = useRef<HTMLDivElement>(null);
  useEffect(() => { activeRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, [active]);
  const marks = !hideGrammar && gstyle !== 'plain';

  return (
    <section className="rounded-2xl border border-line bg-surface px-6 pb-3 pt-6">
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
        <span className="eyebrow">Lyrics table</span>
        {marks && chunks && (
          <span className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted">
            <span className="flex items-center gap-1.5"><span className="h-0.5 w-6 bg-(--slot-2)" />verb … its partner at the end</span>
            <span className="flex items-center gap-1.5"><span className="size-3 rounded border border-(--slot-1)" />who does it</span>
            <span>click a line to play it</span>
          </span>
        )}
      </div>
      {song.lines.map((line, li) => {
        const isActive = li === active;
        const q = line.question && marks && learned.includes(line.question === 'w' ? 'wQuestion' : 'ynQuestion') ? line.question : null;
        return (
          <div key={li} ref={isActive ? activeRef : undefined} onClick={() => goTo(li, line.time)}
            className={`grid cursor-pointer grid-cols-[64px_minmax(0,1fr)] border-b border-line py-2.5 ${isActive ? 'rounded-xl bg-surface2 shadow-[inset_3px_0_0_var(--accent)]' : ''}`}>
            <span className="flex flex-col items-start gap-1 pl-3 pt-1">
              <span className="font-mono text-[11px] text-faint">{line.time != null ? fmt(line.time) : ''}</span>
              {q && <Tag color={`var(--slot-${q === 'w' ? 1 : 2})`}>{q === 'w' ? 'W-?' : 'JA/NEIN?'}</Tag>}
            </span>
            <div className="min-w-0">
              {line.tokens.length > 0
                ? <ChunkStrip tokens={line.tokens} size="sm" />
                : <div className="text-sm text-faint">{line.text}</div>}
              {line.translation && <div className="pt-1 text-[13px] text-muted">{shortTranslation(line.translation)}</div>}
            </div>
          </div>
        );
      })}
    </section>
  );
}

function Tag({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span className="rounded-full px-1.5 font-mono text-[9px] font-bold tracking-wide"
      style={{ background: color, color: 'var(--on)' } as CSSProperties}>
      {children}
    </span>
  );
}
