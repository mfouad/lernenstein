import { ArrowDown, ArrowUp, Copy, Download, ExternalLink, Play, Plus, RotateCcw, Smartphone, Trash2, Upload, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { loadLibrary, type RawLibrary } from '../data/library.ts';
import { playInApp } from '../lib/play.ts';
import { addPoint, type SyncPoint } from '../lib/sync.ts';
import { useSettings } from '../store/settings.ts';
import type { LibraryItem, Source } from '../types.ts';
import { Prefill } from './Prefill.tsx';
import { blankItem, loadDraft, parseYoutubeId, saveDraft, shipped, toJson, validate } from './draft.ts';

const field = 'h-9 w-full rounded-[10px] border border-line2 bg-surface2 px-2.5 text-sm text-ink outline-none focus:border-accent';
const btn = 'no-underline flex h-9 cursor-pointer items-center gap-1.5 rounded-[10px] border border-line2 bg-surface2 px-3 text-[13px] font-semibold text-ink disabled:cursor-default disabled:opacity-40';
const SOURCES: Source[] = ['lrclib', 'wikisource', 'static', 'link'];

export default function Studio({ slug: wanted }: { slug?: string }) {
  const [items, setItems] = useState(loadDraft);
  const [slug, setSlug] = useState(() => (items.some((i) => i.slug === wanted) ? wanted! : items[0]?.slug ?? ''));
  // Opened again with another entry (e.g. from the player's Edit button).
  useEffect(() => { if (wanted && items.some((i) => i.slug === wanted)) setSlug(wanted); }, [wanted]);
  const [query, setQuery] = useState('');
  const [note, setNote] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const theme = useSettings((s) => s.theme);

  useEffect(() => { document.documentElement.classList.toggle('dark', theme === 'dark'); }, [theme]);
  useEffect(() => { saveDraft(items); }, [items]);

  const problems = useMemo(() => validate(items), [items]);
  const fatal = problems.some((p) => p.fatal);
  const dirty = useMemo(() => toJson(items) !== toJson(shipped()), [items]);
  const index = items.findIndex((i) => i.slug === slug);
  const current = items[index] as LibraryItem | undefined;
  const shown = items.filter((i) => `${i.title} ${i.by} ${i.slug}`.toLowerCase().includes(query.toLowerCase()));

  const flash = (m: string) => { setNote(m); setTimeout(() => setNote(''), 2500); };
  const patch = (p: Partial<LibraryItem>) => {
    setItems((all) => all.map((i, n) => (n === index ? { ...i, ...p } : i)));
    if (p.slug !== undefined) setSlug(p.slug);
  };
  const add = (kind: LibraryItem['kind']) => {
    const item = blankItem(kind, new Set(items.map((i) => i.slug)));
    setItems([...items, item]);
    setSlug(item.slug);
  };
  const remove = () => {
    if (!current || !confirm(`Delete "${current.title}"?`)) return;
    const next = items.filter((_, n) => n !== index);
    setItems(next);
    setSlug(next[Math.min(index, next.length - 1)]?.slug ?? '');
  };
  const move = (d: number) => {
    const to = index + d;
    if (to < 0 || to >= items.length) return;
    const next = [...items];
    [next[index], next[to]] = [next[to], next[index]];
    setItems(next);
  };
  const reset = () => {
    if (!confirm('Discard all studio edits and go back to the shipped library?')) return;
    const next = shipped();
    setItems(next);
    setSlug(next[0]?.slug ?? '');
  };

  const download = () => {
    const url = URL.createObjectURL(new Blob([toJson(items)], { type: 'application/json' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: 'library.json' });
    a.click();
    URL.revokeObjectURL(url);
    flash('Downloaded library.json');
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(toJson(items)); flash('Copied to clipboard'); } catch { flash('Copy failed'); }
  };
  const importFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const next = loadLibrary(JSON.parse(await file.text()) as RawLibrary);
      if (!next.length) throw new Error('empty');
      setItems(next);
      setSlug(next[0].slug);
      flash(`Imported ${next.length} entries`);
    } catch {
      flash('Not a valid library.json');
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="min-h-screen bg-bg text-ink">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-3 px-4 py-3.5 md:px-7">
          <div className="text-[28px] font-extrabold leading-none tracking-tight">Lernen<span className="text-en">stein</span> <span className="font-mono text-sm font-semibold uppercase tracking-widest text-faint">Studio</span></div>
          <a href="#/play" className="text-sm text-accent underline">Back to the app</a>
          <a href="#/" className="text-sm text-accent underline">Library</a>
          <div className="flex-1" />
          {note && <span role="status" className="text-sm text-good">{note}</span>}
          <span className="font-mono text-xs text-muted">{items.length} entries{dirty ? ' · edited' : ''}</span>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => importFile(e.target.files?.[0])} />
          <button type="button" className={btn} onClick={() => fileRef.current?.click()}><Upload size={15} />Import</button>
          <button type="button" className={btn} onClick={reset} disabled={!dirty}><RotateCcw size={15} />Reset</button>
          <button type="button" className={btn} onClick={copy} disabled={fatal}><Copy size={15} />Copy JSON</button>
          <button type="button" className={`${btn} !border-accent !bg-accent !text-bg`} onClick={download} disabled={fatal}><Download size={15} />Export JSON</button>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1440px] flex-wrap items-start gap-6 px-4 pb-12 pt-6 md:px-7">
        <nav className="flex min-w-0 flex-[1_1_280px] flex-col gap-3" aria-label="Library entries">
          <input className={field} placeholder="Filter…" aria-label="Filter entries" value={query} onChange={(e) => setQuery(e.target.value)} />
          <div className="flex gap-2">
            <button type="button" className={btn} onClick={() => add('song')}><Plus size={15} />Song</button>
            <button type="button" className={btn} onClick={() => add('poem')}><Plus size={15} />Poem</button>
          </div>
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {shown.map((i) => {
              const bad = problems.filter((p) => p.slug === i.slug);
              return (
                <li key={i.slug}>
                  <button type="button" onClick={() => setSlug(i.slug)} aria-current={i.slug === slug}
                    className={`flex w-full cursor-pointer items-center gap-2 rounded-[10px] border px-3 py-2 text-left text-sm ${i.slug === slug ? 'border-accent bg-surface2' : 'border-line bg-surface'}`}>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{i.title || '(no title)'}</span>
                      <span className="block truncate text-xs text-muted">{i.by || '—'} · {i.kind}</span>
                    </span>
                    {!!i.sync?.length && <span className="font-mono text-[10px] text-faint">{i.sync.length} sync</span>}
                    {bad.length > 0 && <span className={`font-mono text-xs ${bad.some((p) => p.fatal) ? 'text-en' : 'text-faint'}`} title={bad.map((p) => p.message).join('\n')}>!</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <main className="min-w-0 flex-[999_1_560px]">
          {current ? (
            <Editor key={index} item={current} patch={patch} problems={problems.filter((p) => p.slug === current.slug)}
              onDelete={remove} onMove={move} canUp={index > 0} canDown={index < items.length - 1} />
          ) : (
            <p className="rounded-2xl border border-line bg-surface p-10 text-muted">No entries. Add a song or a poem.</p>
          )}
          <details className="mt-4 rounded-2xl border border-line bg-surface p-4">
            <summary className="cursor-pointer text-sm font-semibold">JSON preview</summary>
            <p className="text-xs text-muted">Save the export as <code>data/library.json</code> to replace the library.</p>
            <pre className="max-h-96 overflow-auto font-mono text-xs">{toJson(items)}</pre>
          </details>
        </main>
      </div>
    </div>
  );
}

function Editor({ item, patch, problems, onDelete, onMove, canUp, canDown }: {
  item: LibraryItem; patch: (p: Partial<LibraryItem>) => void; problems: ReturnType<typeof validate>;
  onDelete: () => void; onMove: (d: number) => void; canUp: boolean; canDown: boolean;
}) {
  const text = (key: 'slug' | 'title' | 'by' | 'genre' | 'level', label: string) => (
    <Field label={label}>
      <input className={field} value={item[key] ?? ''} onChange={(e) => patch({ [key]: e.target.value })} />
    </Field>
  );
  const nullable = (key: 'youtubeId' | 'lyricsUrl', label: string, parse: (v: string) => string | null) => (
    <Field label={label}>
      <input className={`${field} font-mono`} value={item[key] ?? ''} onChange={(e) => patch({ [key]: parse(e.target.value) })} />
    </Field>
  );
  return (
    <section className="rounded-2xl border border-line bg-surface p-5">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h2 className="m-0 flex-1 text-lg font-bold">{item.title || '(no title)'}</h2>
        <button type="button" className={btn} onClick={() => playInApp(item)}><Play size={15} />Play in app</button>
        {item.youtubeId && <a className={btn} href={`https://www.youtube.com/watch?v=${item.youtubeId}`} target="_blank" rel="noreferrer"><ExternalLink size={15} />YouTube</a>}
        {item.lyricsUrl && <a className={btn} href={item.lyricsUrl} target="_blank" rel="noreferrer"><ExternalLink size={15} />{item.source === 'lrclib' ? 'LRCLIB' : 'Lyrics'}</a>}
        <button type="button" className={btn} aria-label="Move up" onClick={() => onMove(-1)} disabled={!canUp}><ArrowUp size={15} /></button>
        <button type="button" className={btn} aria-label="Move down" onClick={() => onMove(1)} disabled={!canDown}><ArrowDown size={15} /></button>
        <button type="button" className={btn} onClick={onDelete}><Trash2 size={15} />Delete</button>
      </div>
      {item.kind === 'song' && <Prefill item={item} patch={patch} />}
      {problems.length > 0 && (
        <ul className="mb-4 mt-0 list-none rounded-[10px] border border-line2 bg-surface2 p-3 text-sm">
          {problems.map((p) => <li key={p.message} className={p.fatal ? 'text-en' : 'text-muted'}>{p.fatal ? 'Error: ' : 'Warning: '}{p.message}</li>)}
        </ul>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {text('title', 'Title')}
        {text('by', item.kind === 'song' ? 'Artist' : 'Author')}
        {text('slug', 'Slug')}
        <Field label="Kind">
          <select className={field} value={item.kind} onChange={(e) => patch({ kind: e.target.value as LibraryItem['kind'] })}>
            <option value="song">Song</option>
            <option value="poem">Poem</option>
          </select>
        </Field>
        {nullable('youtubeId', 'YouTube id or link', (v) => parseYoutubeId(v))}
        {nullable('lyricsUrl', 'Lyrics URL', (v) => v.trim() || null)}
        <Field label="Source">
          <select className={field} value={item.source} onChange={(e) => patch({ source: e.target.value as Source })}>
            {SOURCES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Rights">
          <select className={field} value={item.rights} onChange={(e) => patch({ rights: e.target.value as LibraryItem['rights'] })}>
            <option value="pd">pd (public domain)</option>
            <option value="copyrighted">copyrighted</option>
          </select>
        </Field>
        {text('genre', 'Genre')}
        {text('level', 'Level')}
      </div>
      <Field label="Why it works" className="mt-3">
        <textarea className={`${field} h-24 py-2`} value={item.why_it_works} onChange={(e) => patch({ why_it_works: e.target.value })} />
      </Field>
      <SyncEditor item={item} onChange={(sync) => patch({ sync })} />
    </section>
  );
}

function SyncEditor({ item, onChange }: { item: LibraryItem; onChange: (s: SyncPoint[]) => void }) {
  const points = item.sync ?? [];
  const device = useSettings((s) => s.syncs[item.slug]);
  const set = useSettings((s) => s.set);
  const edit = (n: number, key: keyof SyncPoint, v: string) => {
    const num = Number.parseFloat(v);
    if (!Number.isFinite(num) || num < 0) return;
    onChange(points.map((p, i) => (i === n ? { ...p, [key]: num } : p)).sort((a, b) => a.line - b.line));
  };
  return (
    <div className="mt-5 border-t border-line pt-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h3 className="m-0 flex-1 text-sm font-bold">Sync points <span className="font-normal text-muted">(line time → video time, seconds)</span></h3>
        <button type="button" className={btn} disabled={!device?.length} title="Copy the points you set in the app on this device"
          onClick={() => onChange(device!.reduce(addPoint, points))}><Smartphone size={15} />Import from this device{device?.length ? ` (${device.length})` : ''}</button>
        <button type="button" className={btn} onClick={() => onChange(addPoint(points, { line: (points.at(-1)?.line ?? -1) + 1, video: (points.at(-1)?.video ?? -1) + 1 }))}><Plus size={15} />Add</button>
        <button type="button" className={btn} disabled={!device} title="Replace this device's points with the ones above"
          onClick={() => set({ syncs: { ...useSettings.getState().syncs, [item.slug]: points } })}>Use on this device</button>
      </div>
      {points.length === 0 ? (
        <p className="m-0 text-sm text-muted">No sync points. Lyrics time = video time. Set them in the app (Sync buttons under the player), then import them here.</p>
      ) : (
        <table className="w-full font-mono text-xs">
          <thead><tr className="text-left text-muted"><th className="font-normal">Line (s)</th><th className="font-normal">Video (s)</th><th /></tr></thead>
          <tbody>
            {points.map((p, n) => (
              <tr key={`${n}:${p.line}:${p.video}`}>
                {(['line', 'video'] as const).map((k) => (
                  <td key={k} className="py-1 pr-2">
                    <input type="number" min={0} step={0.01} aria-label={`${k} time of point ${n + 1}`} className={field} defaultValue={p[k]} onBlur={(e) => edit(n, k, e.target.value)} />
                  </td>
                ))}
                <td className="text-right">
                  <button type="button" aria-label="Remove sync point" className="cursor-pointer bg-transparent text-muted" onClick={() => onChange(points.filter((_, i) => i !== n))}><X size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`grid gap-1 ${className}`}>
      <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-faint">{label}</span>
      {children}
    </label>
  );
}
