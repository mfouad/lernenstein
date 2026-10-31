import { Clock, Pause, Play, SkipBack, SkipForward, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import YouTube, { type YouTubeEvent, type YouTubePlayer } from 'react-youtube';
import { buildQuiz } from '../lib/quiz.ts';
import { addPoint, lineToVideo, videoToLine, type SyncPoint } from '../lib/sync.ts';
import { usePlayback } from '../store/playback.ts';
import { useSettings } from '../store/settings.ts';
import type { AnalyzedSong, LibraryItem } from '../types.ts';
import { fmt } from './FullLine.tsx';

// `bare` (phone play mode) is just the video, full width, with YouTube's own
// controls: everything else follows the saved settings.
export function PlayerCard({ item, song, bare }: { item: LibraryItem; song: AnalyzedSong | undefined; bare?: boolean }) {
  const player = useRef<YouTubePlayer | null>(null);
  const { repeat, speed, pause, mode, set } = useSettings();
  // Points saved on this device win over the ones shipped with the library.
  const points = useSettings((s) => s.syncs[item.slug]) ?? item.sync ?? NO_POINTS;
  const { active, time, playing, seekTo, goTo } = usePlayback();
  const pausedAt = useRef('');
  const resume = useRef<ReturnType<typeof setTimeout>>(undefined);
  const replayAt = useRef(0);
  const synced = song?.lines[0]?.time != null;

  // Follow the video: pick the active line, and replay it while repeating.
  useEffect(() => {
    if (!song || !synced) return;
    const id = setInterval(async () => {
      const p = player.current;
      if (!p) return;
      const pts = useSettings.getState().syncs[item.slug] ?? item.sync ?? NO_POINTS;
      const t = videoToLine(await p.getCurrentTime(), pts);
      const pb = usePlayback.getState();
      pb.set({ time: t });
      if (!pb.playing) return;
      const lines = song.lines;
      const cur = lines[pb.active];
      const nextTime = lines[pb.active + 1]?.time;
      const quiz = useSettings.getState().mode === 'quiz';
      const retry = useSettings.getState().quizStyle === 'retry';
      const reps = quiz ? 0 : useSettings.getState().repeat; // quiz mode has no repeat
      // Quiz: a line that ends with its word not picked plays again, after the pause.
      if (quiz && retry && cur?.time != null && nextTime != null && t >= nextTime - 0.05 && t < nextTime + 1.5
        && buildQuiz(song)[pb.active] && !pb.solved[pb.active]) {
        if (Date.now() - replayAt.current < 1000) return; // the seek hasn't shown up in the time yet
        replayAt.current = Date.now();
        p.seekTo(lineToVideo(cur.time, pts), true);
        const secs = useSettings.getState().pause;
        if (secs > 0) {
          p.pauseVideo();
          clearTimeout(resume.current);
          resume.current = setTimeout(() => p.playVideo(), secs * 1000);
        }
        return;
      }
      if (cur?.time != null && nextTime != null && t >= nextTime - 0.05 && t < nextTime + 1.5 && pb.pass < reps) {
        p.seekTo(lineToVideo(cur.time, pts), true);
        pb.set({ pass: pb.pass + 1 });
        return;
      }
      // Pause after the last pass of a line, then carry on.
      const secs = useSettings.getState().pause;
      const key = `${pb.active}:${pb.pass}`;
      if (secs > 0 && nextTime != null && pb.pass >= reps && pausedAt.current !== key && t >= nextTime - 0.2 && t < nextTime + 1.5) {
        pausedAt.current = key;
        p.pauseVideo();
        clearTimeout(resume.current);
        resume.current = setTimeout(() => p.playVideo(), secs * 1000);
        return;
      }
      let idx = 0;
      lines.forEach((l, i) => { if (l.time != null && l.time <= t + 0.1) idx = i; });
      if (idx !== pb.active) {
        // Flow: a line that goes by unanswered breaks the streak.
        if (quiz && !retry && idx === pb.active + 1 && buildQuiz(song)[pb.active] && !pb.solved[pb.active]) {
          pb.set({ streak: 0, missed: { ...pb.missed, [pb.active]: true } });
        }
        pb.set({ active: idx, pass: 0 });
      }
    }, 200);
    return () => { clearInterval(id); clearTimeout(resume.current); };
  }, [song, synced, item.slug, item.sync]);

  // Seeks requested elsewhere (clicking a line, prev/next).
  useEffect(() => {
    if (seekTo == null) return;
    player.current?.seekTo(lineToVideo(seekTo, useSettings.getState().syncs[item.slug] ?? item.sync ?? NO_POINTS), true);
    if (usePlayback.getState().restart) player.current?.playVideo();
    usePlayback.getState().set({ seekTo: null, restart: false });
  }, [seekTo, item.slug, item.sync]);

  useEffect(() => { player.current?.setPlaybackRate(speed); }, [speed]);

  // Space plays or pauses from anywhere except text fields.
  useEffect(() => {
    const ignore = (e: KeyboardEvent) => e.code !== 'Space' || !!(e.target as HTMLElement).closest('input, textarea, select, [contenteditable="true"]');
    const down = (e: KeyboardEvent) => {
      if (ignore(e)) return;
      e.preventDefault();
      if (e.repeat) return;
      const p = player.current;
      if (usePlayback.getState().playing) p?.pauseVideo(); else p?.playVideo();
    };
    // A focused button would otherwise also click on Space.
    const up = (e: KeyboardEvent) => { if (!ignore(e)) e.preventDefault(); };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  // Pair the active line's time with the current video time (Line = Video).
  const setPoints = (next: SyncPoint[]) => set({ syncs: { ...useSettings.getState().syncs, [item.slug]: next } });
  const sync = async (which: 'first' | 'current') => {
    const line = which === 'first' ? song?.lines.find((l) => l.time != null)?.time : song?.lines[active]?.time;
    const p = player.current;
    if (line == null || !p) return;
    const video = Math.round((await p.getCurrentTime()) * 100) / 100;
    setPoints(addPoint(points, { line, video }));
  };
  const step = (d: number) => {
    const i = Math.max(0, Math.min((song?.lines.length ?? 1) - 1, active + d));
    goTo(i, song?.lines[i]?.time ?? null);
  };
  const toggle = () => (playing ? player.current?.pauseVideo() : player.current?.playVideo());

  const video = (
    // The player stays visible and uncovered (YouTube terms, CLAUDE.md): at least
    // 200px tall, even where 20% of the screen would be less.
    <div className={`overflow-hidden bg-black ${bare ? 'h-[max(20dvh,200px)] w-full' : 'h-[220px] rounded-xl'}`}>
        {item.youtubeId ? (
          <YouTube
            videoId={item.youtubeId}
            className="size-full"
            iframeClassName="size-full"
            opts={{ playerVars: bare ? { playsinline: 1, rel: 0, fs: 0, disablekb: 1, iv_load_policy: 3 } : { playsinline: 1, rel: 0 } }}
            onReady={(e: YouTubeEvent) => { player.current = e.target; e.target.setPlaybackRate(useSettings.getState().speed); }}
            onStateChange={(e: YouTubeEvent<number>) => {
              const pb = usePlayback.getState();
              pb.set({ playing: e.data === 1, ...(e.data === 0 && useSettings.getState().mode === 'quiz' ? { finished: true } : {}) });
            }}
          />
        ) : (
          <div className="grid size-full place-items-center p-6 text-center text-sm text-[#c9d1df]">No video for this item yet.</div>
        )}
    </div>
  );
  if (bare) return video;

  return (
    <section className="rounded-2xl border border-line bg-surface p-3.5">
      {video}
      <div className="mt-3 flex items-center justify-center gap-2">
        <IconButton label="Previous line" onClick={() => step(-1)}><SkipBack size={15} fill="currentColor" /></IconButton>
        <button type="button" aria-label={playing ? 'Pause' : 'Play'} onClick={toggle} disabled={!item.youtubeId}
          className="grid size-11 cursor-pointer place-items-center rounded-full bg-ink text-bg disabled:opacity-40">
          {playing ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" />}
        </button>
        <IconButton label="Next line" onClick={() => step(1)}><SkipForward size={15} fill="currentColor" /></IconButton>
        <span className="ml-1 font-mono text-xs text-muted">{synced ? fmt(time) : 'untimed'}</span>
      </div>
      <p className="mb-0 mt-2 text-center text-xs text-faint">Press <kbd className="rounded border border-line2 bg-surface2 px-1.5 font-mono text-[11px]">Space</kbd> to pause or play</p>
      <div className="mt-3 grid gap-2.5">
        <OptionRow label="Repeat">
          <Options value={mode === 'quiz' ? 0 : repeat} options={[[0, 'Off'], [1, '1×'], [2, '2×'], [3, '3×']]} onChange={(v) => set({ repeat: v })} aria="Repeat each line" disabled={mode === 'quiz'} />
        </OptionRow>
        <OptionRow label="Speed">
          <Options value={speed} options={SPEEDS.map((v) => [v, `${v}x`] as const)} onChange={(v) => set({ speed: v })} aria="Playback speed" mono />
        </OptionRow>
        <OptionRow label="Pause">
          <Options value={pause} options={[[0, 'Off'], [2, '2s'], [5, '5s'], [10, '10s']]} onChange={(v) => set({ pause: v })} aria="Pause after each line" />
        </OptionRow>
        {synced && (
          <OptionRow label="Sync">
            {(['first', 'current'] as const).map((which) => (
              <button key={which} type="button" onClick={() => sync(which)} disabled={!item.youtubeId}
                title={which === 'first' ? 'Press when the first line starts in the video' : 'Press when the current line is sung in the video'}
                className="flex h-8 cursor-pointer items-center gap-1.5 rounded-[10px] border border-line2 bg-surface2 px-2.5 text-xs text-ink disabled:opacity-40">
                <Clock size={14} />
                {which === 'first' ? 'First line' : 'Current line'}
              </button>
            ))}
          </OptionRow>
        )}
      </div>
      {synced && points.length > 0 && (
        <table className="mt-2.5 w-full font-mono text-xs text-muted">
          <thead>
            <tr className="text-left"><th className="font-normal">Line</th><th className="font-normal">Video</th><td className="text-right">
              <button type="button" onClick={() => setPoints([])} className="cursor-pointer bg-transparent text-xs text-muted">Clear</button>
            </td></tr>
          </thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.line}>
                <td>{p.line.toFixed(2)}s</td>
                <td>{p.video.toFixed(2)}s</td>
                <td className="text-right">
                  <button type="button" aria-label="Remove sync point" title="Remove" onClick={() => setPoints(points.filter((q) => q !== p))}
                    className="cursor-pointer bg-transparent align-middle text-muted"><X size={13} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {!synced && song && (
        <p className="mb-0 mt-2.5 text-xs text-muted">This text has no timings. Step through it with ← → or the buttons.</p>
      )}
    </section>
  );
}

const NO_POINTS: SyncPoint[] = [];
const SPEEDS = [0.7, 0.8, 0.9, 1] as const;

function OptionRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-14 shrink-0 font-mono text-[10px] font-semibold uppercase tracking-widest text-faint">{label}</span>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

function Options<T extends number>({ value, options, onChange, aria, mono, disabled }: { value: T; options: readonly (readonly [T, string])[]; onChange: (v: T) => void; aria: string; mono?: boolean; disabled?: boolean }) {
  return (
    <div role="group" aria-label={aria} className="flex overflow-hidden rounded-[10px] border border-line2">
      {options.map(([v, label]) => (
        <button key={v} type="button" aria-pressed={value === v} disabled={disabled} onClick={() => onChange(v)}
          className={`h-8 cursor-pointer px-2.5 text-xs disabled:cursor-default disabled:opacity-50 ${mono ? 'font-mono' : ''} ${value === v ? 'bg-accent font-bold text-bg' : 'bg-surface2 text-muted'}`}>
          {label}
        </button>
      ))}
    </div>
  );
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick}
      className="grid size-9 cursor-pointer place-items-center rounded-[10px] border border-line2 bg-surface2 text-ink">
      {children}
    </button>
  );
}
