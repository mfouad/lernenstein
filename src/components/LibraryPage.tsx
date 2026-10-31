import * as ToggleGroup from '@radix-ui/react-toggle-group';
import { ExternalLink, Moon, Music, Pencil, Play, Plus, Sun } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { playInApp } from '../lib/play.ts';
import { isLocal, studioHref } from '../lib/route.ts';
import { addDraftItem, currentLibrary } from '../studio/draft.ts';
import { useSettings } from '../store/settings.ts';
import type { LibraryItem } from '../types.ts';

type Group = 'kind' | 'level' | 'genre';
const GROUPS: [Group, string][] = [['kind', 'Type'], ['level', 'Level'], ['genre', 'Genre']];
const LEVEL_ORDER = ['Absolute Beginner', 'Beginner', 'Intermediate', 'Advanced'];

const label = (i: LibraryItem, g: Group) =>
  g === 'kind' ? (i.kind === 'song' ? 'Songs' : 'Poems') : g === 'level' ? i.level || 'No level' : i.genre || (i.kind === 'poem' ? 'Poems' : 'No genre');

export default function LibraryPage() {
  const { theme, set } = useSettings();
  const [group, setGroup] = useState<Group>('level');
  const [query, setQuery] = useState('');
  const items = useMemo(currentLibrary, []);

  useEffect(() => { document.documentElement.classList.toggle('dark', theme === 'dark'); }, [theme]);

  const sections = useMemo(() => {
    const q = query.toLowerCase();
    const map = new Map<string, LibraryItem[]>();
    for (const i of items) {
      if (q && !`${i.title} ${i.by}`.toLowerCase().includes(q)) continue;
      const k = label(i, group);
      map.set(k, [...(map.get(k) ?? []), i]);
    }
    const rank = (k: string) => (group === 'level' ? (LEVEL_ORDER.indexOf(k) + 1 || 99) : 0);
    return [...map].sort((a, b) => rank(a[0]) - rank(b[0]));
  }, [items, group, query]);

  return (
    <div className="min-h-screen bg-bg text-ink">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-3 px-4 py-3.5 md:px-7">
          <a href="#/" className="text-[28px] font-extrabold leading-none tracking-tight text-ink no-underline">Lernen<span className="text-en">stein</span></a>
          <span className="font-mono text-sm font-semibold uppercase tracking-widest text-faint">Library</span>
          <div className="flex-1" />
          {isLocal && (['song', 'poem'] as const).map((kind) => (
            <button key={kind} type="button" onClick={() => { location.hash = studioHref(addDraftItem(kind)); }}
              className="flex h-9 cursor-pointer items-center gap-1.5 rounded-[10px] border border-line2 bg-surface2 px-3 text-[13px] font-semibold text-ink">
              <Plus size={15} />Add {kind}
            </button>
          ))}
          <input aria-label="Search the library" placeholder="Search…" value={query} onChange={(e) => setQuery(e.target.value)}
            className="h-9 w-48 rounded-[10px] border border-line2 bg-surface2 px-2.5 text-sm text-ink outline-none focus:border-accent" />
          <ToggleGroup.Root type="single" value={group} onValueChange={(v) => v && setGroup(v as Group)} aria-label="Group by"
            className="flex items-center gap-0.5 rounded-[10px] border border-line bg-surface p-[3px]">
            <span className="px-2 font-mono text-[10px] font-semibold uppercase tracking-widest text-faint">Group</span>
            {GROUPS.map(([v, l]) => (
              <ToggleGroup.Item key={v} value={v} className="cursor-pointer rounded-[7px] px-3 py-1.5 text-[13px] font-medium text-muted data-[state=on]:bg-surface2 data-[state=on]:text-ink">{l}</ToggleGroup.Item>
            ))}
          </ToggleGroup.Root>
          <button type="button" aria-label={theme === 'dark' ? 'Light theme' : 'Dark theme'} onClick={() => set({ theme: theme === 'dark' ? 'light' : 'dark' })}
            className="grid size-9 cursor-pointer place-items-center rounded-[10px] border border-line2 bg-surface2 text-ink">
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-[1440px] px-4 pb-12 pt-6 md:px-7">
        {sections.length === 0 && <p className="text-muted">Nothing matches.</p>}
        {sections.map(([name, list]) => (
          <section key={name} className="mb-8" aria-label={name}>
            <h2 className="mb-3 mt-0 text-lg font-bold">{name} <span className="font-mono text-xs font-normal text-muted">{list.length}</span></h2>
            <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4 p-0">
              {list.map((i) => <Card key={i.slug} item={i} onPlay={() => playInApp(i)} />)}
            </ul>
          </section>
        ))}
      </main>
    </div>
  );
}

function Card({ item, onPlay }: { item: LibraryItem; onPlay: () => void }) {
  const [broken, setBroken] = useState(false);
  const linkOnly = item.source === 'link';
  return (
    <li className="flex flex-col overflow-hidden rounded-2xl border border-line bg-surface">
      <div className="aspect-video bg-surface2">
        {item.youtubeId && !broken ? (
          <img src={`https://i.ytimg.com/vi/${item.youtubeId}/mqdefault.jpg`} alt="" loading="lazy" onError={() => setBroken(true)} className="size-full object-cover" />
        ) : (
          <div className="grid size-full place-items-center text-faint"><Music size={32} /></div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-3">
        <div className="min-w-0">
          <div className="truncate font-semibold" title={item.title}>{item.title}</div>
          <div className="truncate text-sm text-muted">{item.by || '—'}</div>
        </div>
        <div className="mt-auto flex gap-2">
          <button type="button" onClick={onPlay} disabled={linkOnly && !item.lyricsUrl} aria-label={`${linkOnly ? 'Open' : 'Play'} ${item.title}`}
            className="flex h-9 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-[10px] border-0 bg-accent text-[13px] font-bold text-on disabled:opacity-40">
            {linkOnly ? <><ExternalLink size={14} />Open</> : <><Play size={14} fill="currentColor" />Play</>}
          </button>
          {isLocal && (
            <a href={studioHref(item.slug)} aria-label={`Edit ${item.title}`}
              className="flex h-9 items-center gap-1.5 rounded-[10px] border border-line2 bg-surface2 px-3 text-[13px] font-semibold text-ink no-underline">
              <Pencil size={14} />Edit
            </a>
          )}
        </div>
      </div>
    </li>
  );
}
