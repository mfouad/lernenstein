import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { PlayerCard } from '../src/components/PlayerCard.tsx';
import { ShowCard } from '../src/components/Sidebar.tsx';
import { useSettings } from '../src/store/settings.ts';
import type { LibraryItem } from '../src/types.ts';

const item: LibraryItem = {
  slug: 'demo', kind: 'song', title: 'Demo', by: 'Nobody', youtubeId: null, lyricsUrl: null,
  source: 'static', rights: 'pd', level: 'Beginner', why_it_works: '',
};

beforeEach(() => {
  localStorage.clear();
  useSettings.setState({ repeat: 0, view: 'all', hideTranslation: false });
});

describe('repeat button', () => {
  it('cycles off → 1 → 2 → 3 → off with a badge, never an "×"', () => {
    render(<PlayerCard item={item} song={undefined} />);
    const labels: string[] = [];
    for (let i = 0; i < 4; i++) {
      const btn = screen.getByRole('button', { name: /repeat each line/i });
      labels.push(btn.getAttribute('aria-label')!);
      expect(btn.textContent).not.toContain('×');
      fireEvent.click(btn);
    }
    expect(labels).toEqual([
      'Repeat each line: off',
      'Repeat each line 1 more time',
      'Repeat each line 2 more times',
      'Repeat each line 3 more times',
    ]);
    expect(useSettings.getState().repeat).toBe(0);
  });
});

describe('Show card', () => {
  it('switches the word filter and hides translations', () => {
    render(<ShowCard />);
    fireEvent.click(screen.getByRole('radio', { name: /new only/i }));
    expect(useSettings.getState().view).toBe('new');
    fireEvent.click(screen.getByRole('switch', { name: /hide translation/i }));
    expect(useSettings.getState().hideTranslation).toBe(true);
  });
});
