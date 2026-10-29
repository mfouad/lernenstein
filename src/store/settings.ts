import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FormKey, Pos } from '../types.ts';

export type Mode = 'line' | 'table';
export type GrammarStyle = 'color' | 'underline' | 'chips' | 'slots';
export type View = 'all' | 'new' | 'known' | 'nv';
export type Theme = 'dark' | 'light';

export interface SavedWord {
  key: string; // lemma, lowercased
  text: string;
  lemma: string;
  gloss: string;
  pos: Pos;
}

interface State {
  slug: string;
  theme: Theme;
  mode: Mode;
  gstyle: GrammarStyle;
  view: View;
  hideTranslation: boolean;
  hideGrammar: boolean;
  translateLines: boolean;
  learned: FormKey[];
  repeat: 0 | 1 | 2 | 3;
  known: Record<string, SavedWord>;
  saved: Record<string, SavedWord>;
  set: (patch: Partial<Omit<State, 'set' | 'toggleWord' | 'toggleForm'>>) => void;
  toggleWord: (list: 'known' | 'saved', word: SavedWord) => void;
  toggleForm: (form: FormKey) => void;
}

export const useSettings = create<State>()(
  persist(
    (set) => ({
      slug: 'die-gedanken-sind-frei',
      theme: 'dark',
      mode: 'line',
      gstyle: 'color',
      view: 'all',
      hideTranslation: false,
      hideGrammar: false,
      translateLines: false,
      learned: ['present', 'acc', 'dat', 'kein', 'modal', 'wQuestion'],
      repeat: 0,
      known: {},
      saved: {},
      set: (patch) => set(patch),
      toggleWord: (list, word) => set((s) => {
        const next = { ...s[list] };
        if (next[word.key]) delete next[word.key];
        else next[word.key] = word;
        return { [list]: next };
      }),
      toggleForm: (form) => set((s) => ({
        learned: s.learned.includes(form) ? s.learned.filter((f) => f !== form) : [...s.learned, form],
      })),
    }),
    { name: 'lernenstein-settings' },
  ),
);

export const wordKey = (lemma: string) => lemma.toLowerCase();
