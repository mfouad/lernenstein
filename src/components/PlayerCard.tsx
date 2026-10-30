import { Clock, Pause, Play, Repeat, SkipBack, SkipForward } from 'lucide-react';
import { useEffect, useRef } from 'react';
import YouTube, { type YouTubeEvent, type YouTubePlayer } from 'react-youtube';
import { usePlayback } from '../store/playback.ts';
import { useSettings } from '../store/settings.ts';
import type { AnalyzedSong, LibraryItem } from '../types.ts';
import { fmt } from './FullLine.tsx';

export function PlayerCard({ item, song }: { item: LibraryItem; song: AnalyzedSong | undefined }) {
  const player = useRef<YouTubePlayer | null>(null);
  const { repeat, speed, delay, set } = useSettings();
  const { active, time, playing, seekTo, goTo } = usePlayback();
  const synced = song?.lines[0]?.time != null;

  // Follow the video: pick the active line, and replay it while repeating.
  useEffect(() => {
    if (!song || !synced) return;
    const id = setInterval(async () => {
      const p = player.current;
      if (!p) return;
      // Lyrics clock = video clock + delay.
      const t: number = (await p.getCurrentTime()) + useSettings.getState().delay;
      const pb = usePlayback.getState();
      pb.set({ time: t });
      if (!pb.playing) return;
      const lines = song.lines;
      const cur = lines[pb.active];
      const nextTime = lines[pb.active + 1]?.time;
      const reps = useSettings.getState().repeat;
      if (cur?.time != null && nextTime != null && t >= nextTime - 0.05 && t < nextTime + 1.5 && pb.pass < reps) {
        p.seekTo(cur.time - useSettings.getState().delay, true);
        pb.set({ pass: pb.pass + 1 });
        return;
      }
      let idx = 0;
      lines.forEach((l, i) => { if (l.time != null && l.time <= t + 0.1) idx = i; });
      if (idx !== pb.active) pb.set({ active: idx, pass: 0 });
    }, 200);
    return () => clearInterval(id);
  }, [song, synced]);

  // Seeks requested elsewhere (clicking a line, prev/next).
  useEffect(() => {
    if (seekTo == null) return;
    player.current?.seekTo(seekTo - useSettings.getState().delay, true);
    usePlayback.getState().set({ seekTo: null });
  }, [seekTo]);

  useEffect(() => { player.current?.setPlaybackRate(speed); }, [speed]);

  // Align the first line with the current video time; the delay then applies to every line.
  const sync = async () => {
    const first = song?.lines.find((l) => l.time != null)?.time;
    const p = player.current;
    if (first == null || !p) return;
    set({ delay: Math.round((first - (await p.getCurrentTime())) * 100) / 100 });
  };
  const step = (d: number) => {
    const i = Math.max(0, Math.min((song?.lines.length ?? 1) - 1, active + d));
    goTo(i, song?.lines[i]?.time ?? null);
  };
  const toggle = () => (playing ? player.current?.pauseVideo() : player.current?.playVideo());
  const nextRepeat = ((repeat + 1) % 4) as 0 | 1 | 2 | 3;
  const repeatLabel = repeat === 0 ? 'Repeat each line: off' : `Repeat each line ${repeat} more time${repeat > 1 ? 's' : ''}`;

  return (
    <section className="rounded-2xl border border-line bg-surface p-3.5">
      {/* The player stays visible and uncovered (YouTube terms, CLAUDE.md). */}
      <div className="h-[220px] overflow-hidden rounded-xl bg-black">
        {item.youtubeId ? (
          <YouTube
            videoId={item.youtubeId}
            className="size-full"
            iframeClassName="size-full"
            opts={{ playerVars: { playsinline: 1, rel: 0 } }}
            onReady={(e: YouTubeEvent) => { player.current = e.target; e.target.setPlaybackRate(useSettings.getState().speed); }}
            onStateChange={(e: YouTubeEvent<number>) => usePlayback.getState().set({ playing: e.data === 1 })}
          />
        ) : (
          <div className="grid size-full place-items-center p-6 text-center text-sm text-[#c9d1df]">No video for this item yet.</div>
        )}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <IconButton label="Previous line" onClick={() => step(-1)}><SkipBack size={15} fill="currentColor" /></IconButton>
        <button type="button" aria-label={playing ? 'Pause' : 'Play'} onClick={toggle} disabled={!item.youtubeId}
          className="grid size-11 cursor-pointer place-items-center rounded-full bg-ink text-bg disabled:opacity-40">
          {playing ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" />}
        </button>
        <IconButton label="Next line" onClick={() => step(1)}><SkipForward size={15} fill="currentColor" /></IconButton>
        <span className="ml-1 mr-auto font-mono text-xs text-muted">{synced ? fmt(time) : 'untimed'}</span>
        <button type="button" onClick={() => set({ repeat: nextRepeat })} aria-label={repeatLabel} title={repeatLabel}
          className={`relative grid size-9 cursor-pointer place-items-center rounded-[10px] border ${repeat ? 'border-accent text-accent' : 'border-line2 text-muted'}`}>
          <Repeat size={17} />
          {repeat > 0 && <span className="absolute -right-2 -top-2 grid h-[17px] min-w-[17px] place-items-center rounded-full bg-accent px-1 text-[10px] font-extrabold text-bg">{repeat}</span>}
        </button>
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2">
        <div role="group" aria-label="Playback speed" className="flex overflow-hidden rounded-[10px] border border-line2">
          {SPEEDS.map((v) => (
            <button key={v} type="button" aria-pressed={speed === v} onClick={() => set({ speed: v })}
              className={`h-8 cursor-pointer px-2.5 font-mono text-xs ${speed === v ? 'bg-accent font-bold text-bg' : 'bg-surface2 text-muted'}`}>
              {v}x
            </button>
          ))}
        </div>
        {synced && (
          <div className="flex items-center gap-2">
            <button type="button" onClick={sync} disabled={!item.youtubeId} title="Press when the first line starts in the video"
              className="flex h-8 cursor-pointer items-center gap-1.5 rounded-[10px] border border-line2 bg-surface2 px-2.5 text-xs text-ink disabled:opacity-40">
              <Clock size={14} />
              Sync first line
            </button>
            <button type="button" title="Reset delay" aria-label="Reset delay" onClick={() => set({ delay: 0 })}
              className={`cursor-pointer bg-transparent font-mono text-xs ${delay ? 'text-accent' : 'text-muted'}`}>
              {delay > 0 ? '+' : ''}{delay.toFixed(2)}s
            </button>
          </div>
        )}
      </div>
      {!synced && song && (
        <p className="mb-0 mt-2.5 text-xs text-muted">This text has no timings. Step through it with ← → or the buttons.</p>
      )}
    </section>
  );
}

const SPEEDS = [0.7, 0.8, 0.9, 1] as const;

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick}
      className="grid size-9 cursor-pointer place-items-center rounded-[10px] border border-line2 bg-surface2 text-ink">
      {children}
    </button>
  );
}
