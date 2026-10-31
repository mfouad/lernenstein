import { create } from 'zustand';

// Session-only playback state (not persisted).
interface Playback {
  active: number;
  time: number;
  playing: boolean;
  pass: number; // repeat pass of the current line, 0-based
  seekTo: number | null; // a pending seek for the player
  solved: Record<number, true>; // quiz lines answered right
  missed: Record<number, true>; // quiz lines that got a wrong pick or went by unanswered
  hints: Record<number, true>; // quiz lines whose hidden word shows its gloss
  score: number;
  streak: number; // clean answers in a row
  pop: { id: number; points: number; streak: number } | null; // the latest award, for the score animation
  best: number; // longest streak this game
  finished: boolean; // the video ended in quiz mode: show the summary
  restart: boolean; // play from the seek that is pending
  goTo: (index: number, time: number | null) => void;
  set: (patch: Partial<Omit<Playback, 'set' | 'goTo'>>) => void;
}

// A fresh quiz game.
export const QUIZ_RESET = { solved: {}, missed: {}, hints: {}, score: 0, streak: 0, best: 0, pop: null, finished: false } as const;

export const usePlayback = create<Playback>((set) => ({
  active: 0,
  time: 0,
  playing: false,
  pass: 0,
  seekTo: null,
  ...QUIZ_RESET,
  restart: false,
  goTo: (index, time) => set({ active: index, pass: 0, seekTo: time }),
  set: (patch) => set(patch),
}));
