import { ExternalLink, Search, Wand2 } from 'lucide-react';
import { useRef, useState } from 'react';
import type { LibraryItem } from '../types.ts';
import { fetchYoutube, guessNames, lrclibUrl, searchLrclib, type LrcResult } from './lookup.ts';

const btn = 'flex h-9 cursor-pointer items-center gap-1.5 rounded-[10px] border border-line2 bg-surface2 px-3 text-[13px] font-semibold text-ink no-underline disabled:cursor-default disabled:opacity-40';
const YT_LINK = /(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/)([\w-]{11})/;

// The best hit: synced lyrics first, then a title that matches the one we expect.
const rank = (r: LrcResult, title: string) => Number(r.synced) * 2 + Number(!!title && r.title.toLowerCase().includes(title.toLowerCase()));

export function Prefill({ item, patch }: { item: LibraryItem; patch: (p: Partial<LibraryItem>) => void }) {
  const [input, setInput] = useState('');
  const [results, setResults] = useState<LrcResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [failed, setFailed] = useState(false);
  const box = useRef<HTMLInputElement>(null);
  const text = input.trim();
  const isLink = YT_LINK.test(text) || /^[\w-]{11}$/.test(text) && /\d|[A-Z_-]/.test(text);

  const search = async (q: string, title = '') => {
    const found = (await searchLrclib(q)).sort((a, b) => rank(b, title) - rank(a, title));
    setResults(found);
    return found;
  };

  const use = (r: LrcResult, keepNames: boolean) => {
    patch({ lyricsUrl: lrclibUrl(r.id), source: 'lrclib', ...(keepNames ? {} : { title: r.title, by: r.by }) });
    setMsg(`Lyrics source set to "${r.title}" by ${r.by}`);
  };

  // After a failed fetch: search by the names we already have, or ask for a name.
  const searchByName = async () => {
    const known = item.title === 'Untitled' ? '' : `${item.by} ${item.title}`.trim();
    if (!known) {
      setInput('');
      setMsg('Type the song name, then press Search LRCLIB.');
      box.current?.focus();
      return;
    }
    setInput(known);
    setBusy(true);
    try {
      const found = await search(known, item.title);
      setFailed(!found.length);
      setMsg(found.length ? 'Pick a result to fill in the lyrics source.' : 'No LRCLIB results. Try fewer words.');
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const run = async () => {
    setBusy(true);
    setMsg('');
    setFailed(false);
    try {
      if (isLink) {
        const id = YT_LINK.exec(text)?.[1] ?? text;
        patch({ youtubeId: id });
        const names = guessNames(await fetchYoutube(id));
        patch({ youtubeId: id, title: names.title, by: names.by });
        const found = await search(`${names.by} ${names.title}`, names.title);
        if (found[0]?.synced) use(found[0], true);
        else {
          setMsg(found.length ? 'Pick a lyrics source below.' : 'Names filled in, but LRCLIB has nothing for them.');
          setFailed(!found.length);
        }
      } else {
        const found = await search(text);
        setMsg(found.length ? 'Pick a result to fill in the entry.' : 'No LRCLIB results. Try fewer words.');
        setFailed(!found.length);
      }
    } catch (e) {
      setMsg((e as Error).message);
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mb-4 rounded-[10px] border border-line2 bg-surface2 p-3">
      <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-faint">Prefill</span>
      <form className="mt-2 flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); if (text) run(); }}>
        <input ref={box} aria-label="YouTube link or song name" placeholder="Paste a YouTube link, or type a song name" value={input} onChange={(e) => setInput(e.target.value)}
          className="h-9 min-w-48 flex-1 rounded-[10px] border border-line2 bg-surface px-2.5 text-sm text-ink outline-none focus:border-accent" />
        <button type="submit" className={btn} disabled={busy || !text}>
          {isLink ? <Wand2 size={15} /> : <Search size={15} />}{busy ? 'Working…' : isLink ? 'Fetch everything' : 'Search LRCLIB'}
        </button>
        {!isLink && text && (
          <a className={btn} href={`https://www.youtube.com/results?search_query=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer">
            <ExternalLink size={15} />Find on YouTube
          </a>
        )}
      </form>
      {msg && (
        <p role="status" className="mb-0 mt-2 flex flex-wrap items-center gap-2 text-sm text-muted">
          {msg}
          {failed && <button type="button" className={btn} onClick={searchByName} disabled={busy}><Search size={15} />Search LRCLIB by name</button>}
        </p>
      )}
      {results.length > 0 && (
        <ul className="m-0 mt-2 max-h-56 list-none overflow-auto p-0">
          {results.map((r) => (
            <li key={r.id}>
              <button type="button" onClick={() => use(r, !!item.youtubeId && item.title !== 'Untitled')} aria-pressed={item.lyricsUrl === lrclibUrl(r.id)}
                className="flex w-full cursor-pointer items-center gap-3 rounded-[10px] border-0 bg-transparent px-2 py-1.5 text-left text-sm text-ink hover:bg-surface aria-pressed:bg-surface">
                <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{r.title}</span><span className="block truncate text-xs text-muted">{r.by}</span></span>
                <span className="font-mono text-xs text-muted">{Math.floor(r.duration / 60)}:{String(r.duration % 60).padStart(2, '0')}</span>
                <span className={`font-mono text-[10px] ${r.synced ? 'text-good' : 'text-faint'}`}>{r.synced ? 'synced' : 'plain'}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="mb-0 mt-2 text-xs text-faint">After a name search, paste the YouTube link here (or in the YouTube field below) to set the video.</p>
    </div>
  );
}
