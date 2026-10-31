import type { CSSProperties } from 'react';
import { Flame, Zap } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { shortGloss } from '../lib/gloss.ts';
import { POS_INFO, UNDERLINE } from '../lib/grammar.ts';
import { buildQuiz } from '../lib/quiz.ts';
import { useSettings } from '../store/settings.ts';
import { useShallow } from 'zustand/react/shallow';
import { QUIZ_RESET, usePlayback } from '../store/playback.ts';
import type { AnalyzedSong, Pos } from '../types.ts';
import { LineTranslation } from './LineTranslation.tsx';
import { ChunkStrip } from './ChunkStrip.tsx';
import { QuizOptions } from './QuizOptions.tsx';

// The big words shrink in steps until the line fits: on one row if that's
// possible above ONE_ROW_PX, otherwise no taller than FIT_HEIGHT, and never
// wider than the card.
const MAX_PX = 56;
const ONE_ROW_PX = 36;
const MIN_PX = 24;
const STEP_PX = 4;
const FIT_HEIGHT = 280;
const FIT_HEIGHT_BARE = 340; // phone play mode, where the line has the screen to itself

// Measures the strip's own items, not scrollWidth: the hidden hover buttons on
// the last word stick out past the edge and would always count as overflow.
function needsShrink(el: HTMLElement, px: number, limit: number): boolean {
  const strip = el.firstElementChild as HTMLElement | null;
  if (!strip) return false;
  const items = [...strip.children] as HTMLElement[];
  const right = el.getBoundingClientRect().right;
  const wide = items.some((i) => i.getBoundingClientRect().right > right + 1);
  const wraps = items.length > 1 && items[items.length - 1].offsetTop > items[0].offsetTop + 4;
  return wide || strip.offsetHeight > limit || (wraps && px > ONE_ROW_PX);
}

// `bare` (phone play mode) is just the line and, in the quiz, its options: the
// score and the way back live in the bar above (see MobileLayout).
export function FullLine({ song, bare, onExit }: { song: AnalyzedSong; bare?: boolean; onExit?: () => void }) {
  const { active, pass, goTo } = usePlayback();
  const solved = usePlayback((s) => !!s.solved[s.active]);
  const hinted = usePlayback((s) => !!s.hints[s.active]);
  const { mode, quizStyle, set, repeat, learned, hideGrammar: grammarOff, hideTranslation, chunks, gstyle, main } = useSettings();
  const quiz = mode === 'quiz';
  const question = quiz ? buildQuiz(song)[active] ?? null : null;
  const hideGrammar = grammarOff || gstyle === 'plain';
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
  useLayoutEffect(() => { setPx(MAX_PX); }, [song, active, chunks, gstyle, main, hideGrammar, hideTranslation, learned, width]);
  useLayoutEffect(() => {
    const el = fitRef.current;
    if (el && px > MIN_PX && needsShrink(el, px, bare ? FIT_HEIGHT_BARE : FIT_HEIGHT)) {
      setPx(Math.max(MIN_PX, px - STEP_PX));
    }
  });

  // Memory quiz: a right answer moves on to the next line that has a question.
  const advance = quiz && quizStyle === 'memory' ? () => {
    const pb = usePlayback.getState();
    if (pb.active !== active) return;
    const qs = buildQuiz(song);
    let i = active + 1;
    while (i < song.lines.length && !qs[i]) i++;
    if (i < song.lines.length) pb.goTo(i, null); else pb.set({ finished: true });
  } : undefined;

  const line = song.lines[active];
  if (!line) return null;
  const prev = song.lines[active - 1];
  const next = song.lines[active + 1];
  const q = line.question;
  const de = main === 'de';
  const translation = <LineTranslation text={line.text} given={line.translation} fallback={line.tokens.filter((t) => t.gloss).map((t) => shortGloss(t.gloss, t.pos)).join(' · ')} />;
  const showQ = q && !hideGrammar && learned.includes(q === 'w' ? 'wQuestion' : 'ynQuestion');

  if (bare) {
    return (
      <div className="flex min-h-0 flex-1 flex-col px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
        {!quiz && (de ? translation : <p className="m-0 text-lg text-muted">{line.text}</p>)}
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden">
          <div ref={fitRef} className="w-full min-w-0" style={{ '--word-size': `${px}px` } as CSSProperties}>
            <ChunkStrip key={active} tokens={line.tokens} size="lg" blank={question && !solved ? line.tokens[question.index] : undefined} center={quiz} hint={hinted} />
          </div>
        </div>
        {quiz && <div className="pt-2"><QuizOptions line={active} question={question} solved={solved} advance={advance} /></div>}
        {quiz && <Summary song={song} onExit={onExit} />}
      </div>
    );
  }

  return (
    <section className={`flex flex-col rounded-2xl border border-line bg-surface px-6 pb-4 pt-4 md:px-10 ${quiz ? 'h-[520px]' : 'min-h-[420px]'}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="eyebrow">{quiz ? 'Quiz' : 'Full line'}</span>
          {quiz && (
            <div role="group" aria-label="Quiz style" className="flex overflow-hidden rounded-[10px] border border-line2">
              {([['flow', 'Flow', 'The song keeps playing; pick fast'], ['retry', 'Line by line', 'The line repeats until you get it'], ['memory', 'Memory', 'No song: fill the words from memory, line by line']] as const).map(([v, label, hint]) => (
                <button key={v} type="button" title={hint} aria-pressed={quizStyle === v} onClick={() => set({ quizStyle: v })}
                  className={`h-7 cursor-pointer px-2.5 text-xs ${quizStyle === v ? 'bg-accent font-bold text-bg' : 'bg-surface2 text-muted'}`}>{label}</button>
              ))}
            </div>
          )}
          {showQ && (
            <span className="flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 pl-1 text-xs font-semibold"
              style={{ borderColor: `var(--slot-${q === 'w' ? 1 : 2})`, color: `var(--slot-${q === 'w' ? 1 : 2})` }}>
              <span className="grid size-[18px] place-items-center rounded-full text-[11px] font-extrabold text-on" style={{ background: `var(--slot-${q === 'w' ? 1 : 2})` }}>?</span>
              {q === 'w' ? 'W-Frage · question word, then verb' : 'Ja/Nein-Frage · verb first'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
        {quiz && <Score />}
        <span className="font-mono text-xs text-faint">
          Line {active + 1} / {song.lines.length}
          {repeat > 0 && <span className="text-accent"> · pass {pass + 1} of {repeat + 1}</span>}
          {line.time != null && ` · ${fmt(line.time)}`}
        </span>
        </div>
      </div>
      {!quiz && (de ? translation : <p className="m-0 mt-2.5 text-xl text-muted md:text-2xl">{line.text}</p>)}

      <p className={`mt-3 min-h-6 text-[15px] font-semibold text-faint ${quiz ? 'hidden' : ''}`}>
        {prev && <><span className="mr-2.5 font-mono text-[10px] tracking-widest">PREV</span>{prev.text}</>}
      </p>
      <div className={quiz ? 'flex flex-1 flex-col justify-center' : 'contents'}>
        <div className={`flex items-center py-4 ${quiz ? 'h-[300px] shrink-0 justify-center overflow-hidden' : 'flex-1'}`}>
          <div ref={fitRef} className="w-full min-w-0" style={{ '--word-size': `${px}px` } as CSSProperties}>
            <ChunkStrip key={active} tokens={line.tokens} size="lg" blank={question && !solved ? line.tokens[question.index] : undefined} center={quiz} hint={hinted} />
          </div>
        </div>
        {quiz && <div className="mb-3"><QuizOptions line={active} question={question} solved={solved} advance={advance} /></div>}
      </div>
      <p className={`mb-3 min-h-6 text-[15px] font-semibold text-faint ${quiz ? 'hidden' : ''}`}>
        {next && <><span className="mr-2.5 font-mono text-[10px] tracking-widest">NEXT</span>{next.text}</>}
      </p>

      <div className="mb-3 flex items-center gap-[3px]" aria-label={`Song progress, line ${active + 1} of ${song.lines.length}`}>
        {song.lines.map((l, i) => (
          <button key={i} type="button" aria-label={`Go to line ${i + 1}`} onClick={() => goTo(i, l.time)}
            className={`flex-1 cursor-pointer rounded-sm ${i === active ? 'h-2 bg-accent' : i < active ? 'h-1 bg-line2' : 'h-1 bg-line'}`} />
        ))}
      </div>
      {quiz && <Summary song={song} />}
      <Legend pos={[...new Set(line.tokens.map((t) => t.pos))]} />
    </section>
  );
}

// The running score. Every right answer pops it and shows what it earned; a
// streak of 3+ lights up the flame.
export function Score() {
  const score = useScore();
  const { score: total, streak, pop } = score;
  return (
    <div className="relative flex items-center gap-2" aria-live="polite">
      {streak >= 3 && (
        <span className="flex items-center gap-0.5 text-xs font-bold text-accent" title={`${streak} in a row`}>
          <Flame size={14} fill="currentColor" />{streak}
        </span>
      )}
      <span key={pop?.id ?? 0} className={`flex items-center gap-1.5 rounded-full border border-accent px-3 py-1 font-mono text-base font-extrabold text-accent ${pop ? 'score-pop' : ''}`}>
        <Zap size={14} fill="currentColor" />{total}
      </span>
      {pop && (
        <span key={`+${pop.id}`} className="score-float pointer-events-none absolute -top-1 right-2 font-mono text-sm font-extrabold text-good">+{pop.points}</span>
      )}
    </div>
  );
}

const useScore = () => usePlayback(useShallow((s) => ({ score: s.score, streak: s.streak, pop: s.pop })));

// Shown when the video ends in quiz mode: how the game went, and what next.
function Summary({ song, onExit }: { song: AnalyzedSong; onExit?: () => void }) {
  const { finished, score, best, missed, solved } = usePlayback();
  const set = useSettings((s) => s.set);
  if (!finished) return null;
  const total = buildQuiz(song).filter(Boolean).length;
  const clean = Object.keys(solved).filter((i) => !missed[Number(i)]).length;
  const pct = total ? Math.round((clean / total) * 100) : 0;
  const again = () => {
    const pb = usePlayback.getState();
    const memory = useSettings.getState().quizStyle === 'memory'; // no song to restart
    pb.set({ ...QUIZ_RESET, restart: !memory });
    pb.goTo(0, memory ? null : song.lines.find((l) => l.time != null)?.time ?? null);
  };
  const study = () => { usePlayback.getState().set({ finished: false }); set({ mode: 'line' }); };
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label="Quiz summary">
      <div className="w-full max-w-sm rounded-2xl border border-line2 bg-surface p-6 text-center">
        <div className="eyebrow">Song finished</div>
        <div className="score-pop mt-3 flex items-center justify-center gap-2 text-6xl font-extrabold text-accent"><Zap size={36} fill="currentColor" />{score}</div>
        <div className="mt-1 text-sm text-muted">points</div>
        <div className="mt-5 grid grid-cols-3 gap-2 text-center">
          <Stat label="First try" value={`${clean}/${total}`} />
          <Stat label="Accuracy" value={`${pct}%`} />
          <Stat label="Best streak" value={String(best)} />
        </div>
        <div className="mt-6 grid gap-2">
          <button type="button" autoFocus onClick={again} className="h-11 cursor-pointer rounded-xl bg-accent text-sm font-bold text-bg">Play again</button>
          <button type="button" onClick={study} className="h-10 cursor-pointer rounded-xl border border-line2 bg-surface2 text-sm text-ink">Study the lines</button>
          {onExit && <button type="button" onClick={() => { usePlayback.getState().set({ finished: false }); onExit(); }} className="h-10 cursor-pointer rounded-xl border border-line2 bg-surface2 text-sm text-ink">Back to library</button>}
          <button type="button" onClick={() => usePlayback.getState().set({ finished: false })} className="h-9 cursor-pointer bg-transparent text-xs text-muted">Close</button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface2 px-2 py-2.5">
      <div className="text-xl font-extrabold text-ink">{value}</div>
      <div className="font-mono text-[10px] uppercase tracking-widest text-faint">{label}</div>
    </div>
  );
}

function Legend({ pos }: { pos: Pos[] }) {
  const { gstyle, hideGrammar } = useSettings();
  if (hideGrammar || gstyle === 'plain') return null;
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5 border-t border-line pt-3 text-[13px] text-muted">
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
