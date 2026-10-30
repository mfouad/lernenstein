import { useQuery } from '@tanstack/react-query';
import { analyze } from '../analysis/analyzer.ts';
import dictVersion from '../analysis/dictVersion.json';
import { loadText } from '../sources/fetchText.ts';
import type { AnalyzedSong, LibraryItem } from '../types.ts';

// Public-domain items ship pre-analysed in public/pd/ (the stand-in for a model
// endpoint). Everything else is fetched, cached on the device and analysed here.
async function loadPublicDomain(item: LibraryItem): Promise<AnalyzedSong> {
  // ?v= busts the browser and CDN cache: build:pd reruns after every build:dict.
  const res = await fetch(`${import.meta.env.BASE_URL}pd/${item.slug}.json?v=${dictVersion.version}`);
  if (!res.ok) throw new Error(`No public-domain file for ${item.slug}`);
  return (await res.json()).song;
}

export function useSong(item: LibraryItem | undefined) {
  const isStatic = item?.source === 'static';
  const text = useQuery({
    queryKey: ['text', item?.slug],
    queryFn: () => loadText(item!),
    enabled: !!item && !isStatic && item.source !== 'link' && !!item.lyricsUrl,
    staleTime: Infinity,
    retry: 4,
    retryDelay: (n) => Math.min(1000 * 2 ** n, 15000),
  });
  const analysis = useQuery({
    queryKey: ['analysis', item?.slug, text.data?.fetchedAt],
    queryFn: () => (isStatic ? loadPublicDomain(item!) : analyze(item!, text.data!)),
    enabled: !!item && (isStatic || !!text.data),
    staleTime: Infinity,
  });
  const loading = isStatic ? analysis.isPending : text.isPending;
  const failed = isStatic ? analysis.isError : text.isError;
  return { analysis, loading, failed };
}
