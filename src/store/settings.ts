import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { FORM_ORDER } from '../lib/grammar.ts';
import type { SyncPoint } from '../lib/sync.ts';
import type { FormKey, Pos } from '../types.ts';

export type Mode = 'line' | 'table' | 'quiz';
export type QuizStyle = 'flow' | 'retry'; // flow: the song never stops; retry: a missed line plays again
export type MainLang = 'de' | 'en';
export type GrammarStyle = 'plain' | 'color' | 'underline' | 'chips';
export type View = 'all' | 'new' | 'known' | 'nv';
export type Theme = 'dark' | 'light';
export type GlossSize = 0 | 1 | 2;

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
  quizStyle: QuizStyle;
  gstyle: GrammarStyle;
  main: MainLang; // which language is large in the full line view
  chunks: boolean; // group words into chunks with the verb bracket
  view: View;
  hideTranslation: boolean;
  glossSize: GlossSize; // size of the word glosses in both views
  hideGrammar: boolean;
  translateLines: boolean;
  learned: FormKey[];
  repeat: 0 | 1 | 2 | 3;
  speed: 0.7 | 0.8 | 0.9 | 1;
  pause: 0 | 2 | 5 | 10; // seconds to pause after each line
  syncs: Record<string, SyncPoint[]>; // per song slug: line time = video time pairs
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
      quizStyle: 'retry',
      gstyle: 'color',
      main: 'de',
      chunks: true,
      view: 'all',
      hideTranslation: false,
      glossSize: 1,
      hideGrammar: false,
      translateLines: false,
      learned: FORM_ORDER,
      repeat: 0,
      speed: 1,
      pause: 0,
      syncs: {},
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
      version: 2,
      // v1 dropped the "slots" grammar style.
      migrate: (state, version) => {
        const s = state as Omit<State, 'gstyle'> & { gstyle: string };
        if (version < 1 && s.gstyle === 'slots') s.gstyle = 'color';
        // v2 enabled every form by default (the "forms I've learned" card is gone).
        if (version < 2) s.learned = FORM_ORDER;
        return s as State;
      },
    },
  ),
);

export const wordKey = (lemma: string) => lemma.toLowerCase();
