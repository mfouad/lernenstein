import { Bookmark, ChevronLeft, CircleHelp, ExternalLink, LayoutGrid, Music, Rows3, Search, SlidersHorizontal, TextQuote } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { FullLine, Score } from '../components/FullLine.tsx';
import { modePatch } from '../components/Header.tsx';
import { LyricsTable } from '../components/LyricsTable.tsx';
import { PitchCarousel } from '../components/PitchCarousel.tsx';
import { PlayerCard } from '../components/PlayerCard.tsx';
import { MyWordsCard, ShowCard } from '../components/Sidebar.tsx';
import { QUIZ_RESET, usePlayback } from '../store/playback.ts';
import { useSettings, type GlossSize, type GrammarStyle, type MainLang, type Mode, type QuizStyle } from '../store/settings.ts';
import type { AnalyzedSong, LibraryItem } from '../types.ts';

// The phone layout (below the md breakpoint, see useIsMobile) has two modes.
// Nav mode: Library, Words and Settings behind a bottom tab bar. Play mode:
// the song and nothing else, with a way back at the top; picking a song in the
// library asks how to practise it, then switches to play mode.
type Tab = 'library' | 'words' | 'settings';

const TABS: [Tab, string, typeof LayoutGrid][] = [
  ['library', 'Library', LayoutGrid],
  ['words', 'Words', Bookmark],
  ['settings', 'Settings', SlidersHorizontal],
];

interface Props {
  library: LibraryItem[];
  item: LibraryItem;
  song: AnalyzedSong | undefined;
  loading: boolean;
  failed: boolean;
}

export function MobileLayout({ library, item, song, loading, failed }: Props) {
  const [playing, setPlaying] = useState(false);
  const [tab, setTab] = useState<Tab>('library');
  const [picking, setPicking] = useState<LibraryItem | null>(null);

  const start = (picked: LibraryItem, mode: Mode, quizStyle: QuizStyle) => {
    useSettings.getState().set({ slug: picked.slug, quizStyle, ...modePatch(mode) });
    usePlayback.getState().set({ active: 0, pass: 0, seekTo: null, ...QUIZ_RESET, time: 0, playing: false });
    setPicking(null);
    setPlaying(true);
  };
  const open = (i: LibraryItem) => {
    if (i.source === 'link') { if (i.lyricsUrl) window.open(i.lyricsUrl, '_blank', 'noopener'); return; }
    setPicking(i);
  };

  if (playing) {
    return <PlayMode item={item} song={song} loading={loading} failed={failed} onBack={() => { usePlayback.getState().set({ playing: false, finished: false }); setPlaying(false); }} />;
  }

  return (
    <div className="min-h-dvh overflow-x-clip bg-bg text-ink">
      <header className="px-4 pb-1 pt-4 text-2xl font-extrabold leading-none tracking-tight">Lernen<span className="text-en">stein</span></header>
      <main className="px-4 pb-28 pt-3">
        {tab === 'library' && <MobileLibrary library={library} current={item.slug} onOpen={open} />}
        {tab === 'words' && <MyWordsCard song={song} />}
        {tab === 'settings' && <SettingsTab />}
      </main>
      <nav aria-label="Sections" className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]">
        {TABS.map(([id, label, Icon]) => (
          <button key={id} type="button" aria-current={tab === id ? 'page' : undefined} onClick={() => { setTab(id); scrollTo(0, 0); }}
            className={`flex h-14 flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${tab === id ? 'text-accent' : 'text-muted'}`}>
            <Icon size={21} />{label}
          </button>
        ))}
      </nav>
      {picking && <ModeSheet item={picking} onStart={(mode, style) => start(picking, mode, style)} onClose={() => setPicking(null)} />}
    </div>
  );
}

// Play mode: score row, video (20% of the screen, never under 200px tall), the
// line, and in the quiz the options. No other controls; the video has YouTube's own.
function PlayMode({ item, song, loading, failed, onBack }: Omit<Props, 'library'> & { onBack: () => void }) {
  const mode = useSettings((s) => s.mode);
  const active = usePlayback((s) => s.active);
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-bg text-ink">
      <div className="flex h-12 shrink-0 items-center gap-2 px-2 pt-[env(safe-area-inset-top)] box-content">
        <button type="button" aria-label="Back" onClick={onBack} className="grid size-10 cursor-pointer place-items-center rounded-xl text-ink"><ChevronLeft size={26} /></button>
        {mode === 'quiz' && <Score />}
        <div className="flex-1" />
        {song && <span className="pr-2 font-mono text-xs text-faint">{active + 1} / {song.lines.length}</span>}
      </div>
      <PlayerCard item={item} song={song} bare />
      {loading && <Status>Loading lyrics…</Status>}
      {failed && <Status>The lyrics source is unavailable and this song isn't cached on this device yet.</Status>}
      {song && (mode === 'table'
        ? <div className="min-h-0 flex-1 overflow-auto px-3 pb-3 pt-2"><LyricsTable song={song} /></div>
        : <FullLine song={song} bare onExit={onBack} />)}
    </div>
  );
}

function MobileLibrary({ library, current, onOpen }: { library: LibraryItem[]; current: string; onOpen: (i: LibraryItem) => void }) {
  const [query, setQuery] = useState('');
  const q = query.toLowerCase();
  const sections = new Map<string, LibraryItem[]>();
  for (const i of library) {
    if (q && !`${i.title} ${i.by}`.toLowerCase().includes(q)) continue;
    const g = i.genre || (i.kind === 'poem' ? 'Poems' : 'No genre');
    sections.set(g, [...(sections.get(g) ?? []), i]);
  }
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
      <PitchCarousel />
      <label className="flex h-11 items-center gap-2 rounded-xl border border-line2 bg-surface2 px-3 text-muted">
        <Search size={16} />
        <input aria-label="Search the library" placeholder="Search…" value={query} onChange={(e) => setQuery(e.target.value)} className="min-w-0 flex-1 bg-transparent text-base text-ink outline-none" />
      </label>
      {sections.size === 0 && <p className="m-0 text-muted">Nothing matches.</p>}
      {[...sections].map(([name, list]) => (
      <section key={name} aria-label={name} className="grid grid-cols-[minmax(0,1fr)] gap-2">
      <h2 className="m-0 mt-1 text-base font-bold">{name} <span className="font-mono text-xs font-normal text-muted">{list.length}</span></h2>
      <ul className="m-0 grid list-none grid-cols-[minmax(0,1fr)] gap-2 p-0">
        {list.map((i) => (
          <li key={i.slug}>
            <button type="button" onClick={() => onOpen(i)} disabled={i.source === 'link' && !i.lyricsUrl}
              className={`flex w-full cursor-pointer items-center gap-3 rounded-2xl border bg-surface p-2.5 text-left disabled:opacity-50 ${i.slug === current ? 'border-accent' : 'border-line'}`}>
              <Thumb item={i} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{i.title}</span>
                <span className="block truncate text-sm text-muted">{i.by || '—'}</span>
              </span>
              {i.source === 'link' ? <ExternalLink size={15} className="shrink-0 text-muted" /> : <span className="shrink-0 rounded-full border border-line2 px-2 py-0.5 font-mono text-[10px] font-semibold text-muted">{i.level}</span>}
            </button>
          </li>
        ))}
      </ul>
      </section>
      ))}
    </div>
  );
}

function Thumb({ item }: { item: LibraryItem }) {
  const [broken, setBroken] = useState(false);
  return (
    <span className="grid h-12 w-[86px] shrink-0 place-items-center overflow-hidden rounded-lg bg-surface2 text-faint">
      {item.youtubeId && !broken
        ? <img src={`https://i.ytimg.com/vi/${item.youtubeId}/mqdefault.jpg`} alt="" loading="lazy" onError={() => setBroken(true)} className="size-full object-cover" />
        : <Music size={20} />}
    </span>
  );
}

// "How do you want to practise this?" — the step between the library and play mode.
function ModeSheet({ item, onStart, onClose }: { item: LibraryItem; onStart: (mode: Mode, style: QuizStyle) => void; onClose: () => void }) {
  const [style, setStyle] = useState<QuizStyle>(useSettings.getState().quizStyle);
  const choice = 'flex h-16 w-full cursor-pointer items-center gap-3 rounded-2xl border border-line2 bg-surface2 px-4 text-left';
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/60" role="dialog" aria-modal="true" aria-label="Choose how to practise" onClick={onClose}>
      <div className="w-full rounded-t-3xl border-t border-line2 bg-surface p-4 pb-[max(1rem,env(safe-area-inset-bottom))]" onClick={(e) => e.stopPropagation()}>
        <div className="truncate text-lg font-bold">{item.title}</div>
        <div className="mb-3 truncate text-sm text-muted">{item.by}</div>
        <div className="grid gap-2.5">
          <div className="grid gap-2 rounded-2xl border border-accent bg-surface2 p-3">
            <div className="flex items-center gap-2 font-semibold"><CircleHelp size={20} className="text-accent" />Quiz</div>
            <Segmented label="Quiz style" value={style} onChange={setStyle} options={[['flow', 'Flow'], ['retry', 'Repeat'], ['memory', 'Memory']]} />
            <button type="button" onClick={() => onStart('quiz', style)} className="h-11 cursor-pointer rounded-xl bg-accent text-sm font-bold text-bg">Start quiz</button>
          </div>
          <button type="button" onClick={() => onStart('line', style)} className={choice}><TextQuote size={20} className="text-accent" /><span className="font-semibold">Line by line</span></button>
          <button type="button" onClick={() => onStart('table', style)} className={choice}><Rows3 size={20} className="text-accent" /><span className="font-semibold">Lyrics table</span></button>
        </div>
      </div>
    </div>
  );
}

function SettingsTab() {
  const { gstyle, main, glossSize, chunks, theme, speed, repeat, pause, set } = useSettings();
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
      <section className="grid gap-4 rounded-2xl border border-line bg-surface p-4">
        <span className="eyebrow">Display</span>
        <Segmented showLabel label="Grammar style" value={gstyle} onChange={(v) => set({ gstyle: v as GrammarStyle })}
          options={[['plain', 'Plain'], ['color', 'Color'], ['underline', 'Underline'], ['chips', 'Chips']]} />
        <Segmented showLabel label="Main language" value={main} onChange={(v) => set({ main: v as MainLang })} options={[['de', 'Deutsch'], ['en', 'English']]} />
        <Segmented showLabel label="Gloss size" value={String(glossSize)} onChange={(v) => set({ glossSize: Number(v) as GlossSize })}
          options={[['0', 'Small'], ['1', 'Medium'], ['2', 'Large']]} />
        <Segmented showLabel label="Chunks" value={chunks ? 'on' : 'off'} onChange={(v) => set({ chunks: v === 'on' })} options={[['on', 'On'], ['off', 'Off']]} />
        <Segmented showLabel label="Theme" value={theme} onChange={(v) => set({ theme: v as 'dark' | 'light' })} options={[['dark', 'Dark'], ['light', 'Light']]} />
      </section>
      <section className="grid gap-4 rounded-2xl border border-line bg-surface p-4">
        <span className="eyebrow">Playback</span>
        <Segmented showLabel label="Speed" value={String(speed)} onChange={(v) => set({ speed: Number(v) as typeof speed })}
          options={[['0.7', '0.7x'], ['0.8', '0.8x'], ['0.9', '0.9x'], ['1', '1x']]} />
        <Segmented showLabel label="Repeat each line (not in the quiz)" value={String(repeat)} onChange={(v) => set({ repeat: Number(v) as typeof repeat })}
          options={[['0', 'Off'], ['1', '1×'], ['2', '2×'], ['3', '3×']]} />
        <Segmented showLabel label="Pause after each line" value={String(pause)} onChange={(v) => set({ pause: Number(v) as typeof pause })}
          options={[['0', 'Off'], ['2', '2s'], ['5', '5s'], ['10', '10s']]} />
      </section>
      <ShowCard />
    </div>
  );
}

// Big, thumb-sized choice buttons.
function Segmented<T extends string>({ label, value, onChange, options, showLabel }: { label: string; value: T; onChange: (v: T) => void; options: [T, string][]; showLabel?: boolean }) {
  return (
    <div>
      {showLabel && <div className="mb-1.5 font-mono text-[10px] font-semibold uppercase tracking-widest text-faint">{label}</div>}
      <div role="group" aria-label={label} className="flex overflow-hidden rounded-xl border border-line2">
        {options.map(([v, text]) => (
          <button key={v} type="button" aria-pressed={value === v} onClick={() => onChange(v)}
            className={`h-11 flex-1 cursor-pointer px-2 text-sm font-semibold ${value === v ? 'bg-accent text-bg' : 'bg-surface2 text-muted'}`}>{text}</button>
        ))}
      </div>
    </div>
  );
}

function Status({ children }: { children: ReactNode }) {
  return <p className="m-0 px-4 py-6 text-muted">{children}</p>;
}
