import { create } from 'zustand';

// Session-only playback state (not persisted).
interface Playback {
  active: number;
  time: number;
  playing: boolean;
  pass: number; // repeat pass of the current line, 0-based
  seekTo: number | null; // a pending seek for the player
  solved: Record<number, true>; // quiz lines answered right
  goTo: (index: number, time: number | null) => void;
  set: (patch: Partial<Omit<Playback, 'set' | 'goTo'>>) => void;
}

export const usePlayback = create<Playback>((set) => ({
  active: 0,
  time: 0,
  playing: false,
  pass: 0,
  seekTo: null,
  solved: {},
  goTo: (index, time) => set({ active: index, pass: 0, seekTo: time }),
  set: (patch) => set(patch),
}));
