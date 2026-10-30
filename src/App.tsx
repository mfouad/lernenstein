import { useEffect } from 'react';
import raw from '../data/library.json';
import { FullLine } from './components/FullLine.tsx';
import { Header } from './components/Header.tsx';
import { LyricsTable } from './components/LyricsTable.tsx';
import { PlayerCard } from './components/PlayerCard.tsx';
import { MyWordsCard, ShowCard } from './components/Sidebar.tsx';
import { loadLibrary, type RawLibrary } from './data/library.ts';
import { useSong } from './hooks/useSong.ts';
import { persistStorage } from './sources/db.ts';
import { usePlayback } from './store/playback.ts';
import { useSettings } from './store/settings.ts';

const library = loadLibrary(raw as RawLibrary);

export default function App() {
  const { slug, theme, mode } = useSettings();
  const item = library.find((i) => i.slug === slug && i.source !== 'link') ?? library[0];
  const { analysis, loading, failed } = useSong(item);
  const song = analysis.data;

  useEffect(() => { document.documentElement.classList.toggle('dark', theme === 'dark'); }, [theme]);
  useEffect(() => { persistStorage(); }, []);

  // ← → step through lines.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!song || (e.target as HTMLElement).closest('input, textarea')) return;
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const { active, goTo } = usePlayback.getState();
      const i = Math.max(0, Math.min(song.lines.length - 1, active + (e.key === 'ArrowRight' ? 1 : -1)));
      goTo(i, song.lines[i].time);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [song]);

  return (
    <div className="min-h-screen bg-bg text-ink">
      <Header library={library} item={item} />
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-start gap-6 px-4 pb-12 pt-6 md:px-7">
        <main className="min-w-0 flex-[999_1_640px]">
          {loading && <Status>Loading lyrics…</Status>}
          {failed && (
            <Status>
              The lyrics source is unavailable and this song isn't cached on this device yet.{' '}
              {item.lyricsUrl && <a className="text-accent underline" href={item.lyricsUrl} target="_blank" rel="noreferrer">Open the source</a>}
            </Status>
          )}
          {song && (mode === 'line' ? <FullLine song={song} /> : <LyricsTable song={song} />)}
          <div className="mt-4"><ShowCard /></div>
        </main>
        <aside className="flex min-w-0 flex-[1_1_320px] flex-col gap-4">
          <PlayerCard item={item} song={song} />
          <MyWordsCard song={song} />
        </aside>
      </div>
    </div>
  );
}

function Status({ children }: { children: React.ReactNode }) {
  return <section className="rounded-2xl border border-line bg-surface p-10 text-muted">{children}</section>;
}
