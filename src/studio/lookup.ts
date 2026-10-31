// Metadata lookups for the studio. Both services are public and allow browser requests.
// Only ids and names are kept: lyrics returned by LRCLIB are never read or stored.

export interface YoutubeInfo { title: string; channel: string }

export async function fetchYoutube(id: string): Promise<YoutubeInfo> {
  const url = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(res.status === 401 || res.status === 403 ? 'This video does not allow embedding data' : `YouTube said ${res.status}`);
  const j = (await res.json()) as { title: string; author_name: string };
  return { title: j.title, channel: j.author_name };
}

const YEAR = /\s*[(\[]\d{4}[)\]]/g;
const NOISE = /\s*[(\[](?:official|offizielles?|lyrics?|musik\s?video|music\s?video|video|audio|hd|4k|remaster)[^)\]]*[)\]]/gi;

// "Nena - 99 Luftballons (Official Video)" → { by: "Nena", title: "99 Luftballons" }.
// Without a dash the channel name stands in for the artist.
export function guessNames({ title, channel }: YoutubeInfo): { by: string; title: string } {
  const clean = title.replace(NOISE, '').replace(YEAR, '').trim();
  const m = clean.match(/^(.+?)\s+[-–—|]\s+(.+)$/);
  if (m) return { by: m[1].trim(), title: m[2].trim() };
  return { by: channel.replace(/\s*(?:VEVO|Official|- Topic)\s*$/i, '').trim(), title: clean };
}

export interface LrcResult { id: number; title: string; by: string; duration: number; synced: boolean }

export async function searchLrclib(query: string, signal?: AbortSignal): Promise<LrcResult[]> {
  const url = `https://lrclib.net/api/search?q=${encodeURIComponent(query)}`;
  let res = await fetch(url, { signal });
  if (res.status >= 500) res = await fetch(url, { signal }); // LRCLIB hiccups now and then
  if (!res.ok) throw new Error(`LRCLIB said ${res.status}`);
  const rows = (await res.json()) as { id: number; trackName: string; artistName: string; duration: number; syncedLyrics: string | null }[];
  return rows
    .map((r) => ({ id: r.id, title: r.trackName, by: r.artistName, duration: Math.round(r.duration), synced: !!r.syncedLyrics }))
    .sort((a, b) => Number(b.synced) - Number(a.synced));
}

export const lrclibUrl = (id: number) => `https://lrclib.net/api/get/${id}`;
