import type { SyncPoint } from './lib/sync.ts';

// Parts of speech shown in the UI.
export type Pos =
  | 'N' | 'V' | 'AUX' | 'MOD' | 'PRON' | 'ADJ' | 'ADV'
  | 'DET' | 'PREP' | 'CONN' | 'PRT' | 'NUM' | 'INTJ' | 'X';

// Slots: 0 link, 1 first, 2 verb, 3 middle, 4 the verb's second part,
// 5 after.
export type Slot = 0 | 1 | 2 | 3 | 4 | 5;

export type FormKey =
  | 'present' | 'past' | 'perfect' | 'modal' | 'separable' | 'verbFinal'
  | 'acc' | 'dat' | 'gen' | 'kein' | 'wQuestion' | 'ynQuestion'
  | 'reflexive' | 'adjEnding' | 'poetic';

export type QuestionKind = 'w' | 'yn' | null;

export interface Token {
  text: string;
  lemma: string;
  pos: Pos;
  slot: Slot;
  clause: number; // index within the line
  clauseType: 'main' | 'sub';
  forms: FormKey[];
  gloss: string;
  gender?: 'm' | 'f' | 'n';
  note?: string;
}

export interface RawLine {
  time: number | null; // seconds
  text: string;
}

export interface AnalyzedLine extends RawLine {
  tokens: Token[];
  question: QuestionKind;
  translation?: string;
}

export interface AnalyzedSong {
  slug: string;
  engine: 'model' | 'local';
  lines: AnalyzedLine[];
}

export type Source = 'lrclib' | 'wikisource' | 'static' | 'link';

export interface LibraryItem {
  slug: string;
  kind: 'song' | 'poem';
  title: string;
  by: string;
  youtubeId: string | null;
  lyricsUrl: string | null;
  source: Source;
  rights: 'pd' | 'copyrighted';
  genre?: string;
  level: string;
  why_it_works: string;
  sync?: SyncPoint[]; // default sync points shipped with the entry
}
