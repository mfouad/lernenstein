import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FormKey, Pos } from '../types.ts';

export type Mode = 'line' | 'table';
export type GrammarStyle = 'color' | 'underline' | 'chips';
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
  chunks: boolean; // group words into chunks with the verb bracket
  view: View;
  hideTranslation: boolean;
  hideGrammar: boolean;
  translateLines: boolean;
  learned: FormKey[];
  repeat: 0 | 1 | 2 | 3;
  speed: 0.7 | 0.8 | 0.9 | 1;
  delay: number; // seconds added to the video clock to get the lyrics clock
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
      chunks: true,
      view: 'all',
      hideTranslation: false,
      hideGrammar: false,
      translateLines: false,
      learned: ['present', 'acc', 'dat', 'kein', 'modal', 'wQuestion'],
      repeat: 0,
      speed: 1,
      delay: 0,
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
    {
      name: 'lernenstein-settings',
      version: 1,
      // v1 dropped the "slots" grammar style.
      migrate: (state, version) => {
        const s = state as Omit<State, 'gstyle'> & { gstyle: string };
        if (version < 1 && s.gstyle === 'slots') s.gstyle = 'color';
        return s as State;
      },
    },
  ),
);

export const wordKey = (lemma: string) => lemma.toLowerCase();
