import * as Popover from '@radix-ui/react-popover';
import * as Tabs from '@radix-ui/react-tabs';
import * as ToggleGroup from '@radix-ui/react-toggle-group';
import { Boxes, Check, ChevronDown, CircleHelp, ExternalLink, LayoutGrid, Moon, Music, Pencil, Rows3, Sun, TextQuote } from 'lucide-react';
import { useState } from 'react';
import { isLocal, studioHref } from '../lib/route.ts';
import { QUIZ_RESET, usePlayback } from '../store/playback.ts';
import { useSettings, type GlossSize, type GrammarStyle, type MainLang, type Mode } from '../store/settings.ts';
import type { LibraryItem } from '../types.ts';

const seg = 'flex items-center gap-0.5 rounded-[10px] border border-line bg-surface p-[3px]';
const segItem = 'flex cursor-pointer items-center gap-1.5 rounded-[7px] px-3 py-1.5 text-[13px] font-semibold text-muted data-[state=on]:bg-surface2 data-[state=on]:text-ink data-[state=on]:shadow-[inset_0_0_0_1px_var(--line2)]';

const navLink = 'flex h-9 items-center gap-1.5 rounded-[10px] border border-line2 bg-surface2 px-3 text-[13px] font-semibold text-ink no-underline';

// What switching to a mode changes in the settings (quiz starts without repeats or pauses).
export const modePatch = (v: Mode) => (v === 'quiz' ? { mode: v, repeat: 0 as const, speed: 0.9 as const, pause: 0 as const } : { mode: v });

export function Header({ library, item }: { library: LibraryItem[]; item: LibraryItem }) {
  const { mode, gstyle, main, chunks, glossSize, theme, set } = useSettings();
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-stretch gap-x-5 gap-y-3 px-4 py-3.5 md:px-7">
        <div className="flex items-center py-1 text-[44px] font-extrabold leading-none tracking-tight">Lernen<span className="text-en">stein</span></div>
        <div className="flex-1" />
        <SongPicker library={library} item={item} />
        <a href="#/library" className={`${navLink} self-center`}><LayoutGrid size={15} />Library</a>
        {isLocal && <a href={studioHref(item.slug)} className={`${navLink} self-center`} title="Edit this entry in the Studio"><Pencil size={15} />Edit</a>}
      </div>
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-x-5 gap-y-3 px-4 pb-3.5 md:px-7">
        <ToggleGroup.Root type="single" value={mode} onValueChange={(v) => v && set(modePatch(v as Mode))} className={seg} aria-label="Mode">
          <ToggleGroup.Item value="line" className={segItem}><TextQuote size={15} />Full line</ToggleGroup.Item>
          <ToggleGroup.Item value="table" className={segItem}><Rows3 size={15} />Lyrics table</ToggleGroup.Item>
          <ToggleGroup.Item value="quiz" className={segItem}><CircleHelp size={15} />Quiz</ToggleGroup.Item>
        </ToggleGroup.Root>
        <ToggleGroup.Root type="single" value={gstyle} onValueChange={(v) => v && set({ gstyle: v as GrammarStyle })} className={seg} aria-label="Grammar style">
          <span className="px-2 font-mono text-[10px] font-semibold uppercase tracking-widest text-faint">Style</span>
          {(['plain', 'color', 'underline', 'chips'] as const).map((s) => (
            <ToggleGroup.Item key={s} value={s} className={`${segItem} font-medium capitalize`}>{s}</ToggleGroup.Item>
          ))}
        </ToggleGroup.Root>
        <ToggleGroup.Root type="single" value={main} onValueChange={(v) => v && set({ main: v as MainLang })} className={seg} aria-label="Main language">
          <ToggleGroup.Item value="de" className={`${segItem} font-medium`}>Deutsch</ToggleGroup.Item>
          <ToggleGroup.Item value="en" className={`${segItem} font-medium`}>English</ToggleGroup.Item>
        </ToggleGroup.Root>
        <ToggleGroup.Root type="single" value={String(glossSize)} onValueChange={(v) => v && set({ glossSize: Number(v) as GlossSize })} className={seg} aria-label="Gloss size">
          <span className="px-2 font-mono text-[10px] font-semibold uppercase tracking-widest text-faint">Gloss</span>
          {([['0', 'Small gloss size', 'text-xs'], ['1', 'Medium gloss size', 'text-sm'], ['2', 'Large gloss size', 'text-lg']] as const).map(([v, label, cls]) => (
            <ToggleGroup.Item key={v} value={v} aria-label={label} title={label} className={`${segItem} px-2.5 py-1 font-bold ${cls}`}>A</ToggleGroup.Item>
          ))}
        </ToggleGroup.Root>
        <ToggleGroup.Root type="multiple" value={chunks ? ['chunks'] : []} onValueChange={(v) => set({ chunks: v.includes('chunks') })} className={seg} aria-label="Chunks">
          <ToggleGroup.Item value="chunks" className={segItem}><Boxes size={15} />Chunks</ToggleGroup.Item>
        </ToggleGroup.Root>
        <ToggleGroup.Root type="single" value={theme} onValueChange={(v) => v && set({ theme: v as 'dark' | 'light' })} className={seg} aria-label="Theme">
          <ToggleGroup.Item value="light" aria-label="Light theme" className={`${segItem} px-2`}><Sun size={16} /></ToggleGroup.Item>
          <ToggleGroup.Item value="dark" aria-label="Dark theme" className={`${segItem} px-2`}><Moon size={16} /></ToggleGroup.Item>
        </ToggleGroup.Root>
      </div>
    </header>
  );
}

function SongPicker({ library, item }: { library: LibraryItem[]; item: LibraryItem }) {
  const [open, setOpen] = useState(false);
  const { set } = useSettings();
  const pick = (i: LibraryItem) => {
    if (i.source === 'link') { if (i.lyricsUrl) window.open(i.lyricsUrl, '_blank', 'noopener'); return; }
    set({ slug: i.slug });
    usePlayback.getState().set({ active: 0, pass: 0, seekTo: null, ...QUIZ_RESET, time: 0, playing: false });
    setOpen(false);
  };
  const songs = library.filter((i) => i.kind === 'song');
  const poems = library.filter((i) => i.kind === 'poem');
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger className="flex cursor-pointer items-center gap-3.5 rounded-xl border border-line bg-surface px-4 py-2.5 text-left text-lg font-semibold data-[state=open]:border-accent">
        <span className="grid size-10 place-items-center rounded-[10px] bg-surface2 text-en"><Music size={20} /></span>
        <span className="leading-tight">{item.title}<br /><span className="text-sm font-medium text-muted">{item.by} · {item.level}</span></span>
        <ChevronDown size={18} />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="start" sideOffset={8} collisionPadding={12}
          className="z-50 w-[min(560px,calc(100vw-24px))] rounded-2xl border border-line2 bg-surface p-2 text-ink shadow-2xl">
          <Tabs.Root defaultValue={item.kind}>
            <Tabs.List className="mb-1.5 flex gap-0.5 rounded-[10px] bg-bg p-[3px]">
              <Tabs.Trigger value="song" className="flex-1 cursor-pointer rounded-[7px] py-1.5 text-[13px] font-semibold text-muted data-[state=active]:bg-surface2 data-[state=active]:text-ink">Songs · {songs.length}</Tabs.Trigger>
              <Tabs.Trigger value="poem" className="flex-1 cursor-pointer rounded-[7px] py-1.5 text-[13px] font-semibold text-muted data-[state=active]:bg-surface2 data-[state=active]:text-ink">Poems · {poems.length}</Tabs.Trigger>
            </Tabs.List>
            {([['song', songs], ['poem', poems]] as const).map(([kind, list]) => (
              <Tabs.Content key={kind} value={kind}>
                <ul role="listbox" aria-label={kind === 'song' ? 'Songs' : 'Poems'} className="m-0 max-h-[60vh] list-none overflow-auto p-0">
                  {list.map((i) => (
                    <li key={i.slug} role="option" aria-selected={i.slug === item.slug}>
                      <button type="button" onClick={() => pick(i)} disabled={i.source === 'link' && !i.lyricsUrl}
                        className={`flex w-full cursor-pointer items-center gap-3 rounded-[10px] px-3 py-2 text-left disabled:cursor-default disabled:opacity-50 ${i.slug === item.slug ? 'bg-surface2' : 'hover:bg-surface2'}`}>
                        <span className="min-w-0 flex-1">
                          <span className="block font-semibold">{i.title}</span>
                          <span className="block text-xs text-muted">{i.by}</span>
                        </span>
                        {i.source === 'link' && <span className="flex items-center gap-1 text-xs text-muted"><ExternalLink size={12} />{i.lyricsUrl ? 'link only' : 'no link yet'}</span>}
                        <span className="whitespace-nowrap rounded-full border border-line2 px-2 py-0.5 font-mono text-[10px] font-semibold text-muted">{i.level}</span>
                        <span className="w-4 text-accent">{i.slug === item.slug && <Check size={16} strokeWidth={2.6} />}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </Tabs.Content>
            ))}
          </Tabs.Root>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
