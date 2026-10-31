import { useEffect, useState } from 'react';

// Hash routes: #/ (or #/library) the library, #/play the player, #/studio[/<slug>] the editor.
export type Route = { page: 'play' | 'library' | 'studio'; slug?: string };

export function parseRoute(hash: string): Route {
  const [, page, slug] = hash.split('/');
  if (page === 'play') return { page: 'play' };
  if (page === 'studio') return { page: 'studio', slug: slug ? decodeURIComponent(slug) : undefined };
  return { page: 'library' };
}

// The Studio and its Edit buttons only exist when the app is served from this machine.
export const isLocal = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname) || location.hostname.endsWith('.localhost');

export const studioHref = (slug: string) => `#/studio/${encodeURIComponent(slug)}`;

export function useRoute(): Route {
  const [hash, setHash] = useState(location.hash);
  useEffect(() => {
    const on = () => setHash(location.hash);
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return parseRoute(hash);
}
