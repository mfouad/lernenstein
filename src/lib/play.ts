import { usePlayback } from '../store/playback.ts';
import { useSettings } from '../store/settings.ts';
import type { LibraryItem } from '../types.ts';

// Show an entry in the player (link-only entries open their link instead).
export function playInApp(i: LibraryItem) {
  if (i.source === 'link') { if (i.lyricsUrl) window.open(i.lyricsUrl, '_blank', 'noopener'); return; }
  useSettings.getState().set({ slug: i.slug });
  usePlayback.getState().set({ active: 0, pass: 0, seekTo: null, solved: {}, time: 0, playing: false });
  location.hash = '#/';
}
