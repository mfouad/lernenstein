import { useSyncExternalStore } from 'react';

// Matches Tailwind's `md` breakpoint: below it the app shows the phone layout.
const QUERY = '(max-width: 767px)';

export function useIsMobile(): boolean {
  return useSyncExternalStore(
    (cb) => { const m = matchMedia(QUERY); m.addEventListener('change', cb); return () => m.removeEventListener('change', cb); },
    () => matchMedia(QUERY).matches,
  );
}
