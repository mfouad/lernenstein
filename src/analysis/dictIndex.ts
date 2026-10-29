import type { DictCandidate, Lexicon } from './local/lexicon.ts';

// public/dict/de-en.json (Wiktionary, CC BY-SA), as written by
// scripts/build-dict.ts. Pure code, shared by the app and scripts/build-pd.ts.
export interface DictFile {
  v: string;
  e: [lemma: string, pos: string, gender: string, gloss: string][];
  f: Record<string, number[]>;
}

export interface DictIndex {
  version: string;
  entries: DictFile['e'];
  forms: Map<string, number[]>;
}

export const indexDictionary = (file: DictFile): DictIndex =>
  ({ version: file.v, entries: file.e, forms: new Map(Object.entries(file.f)) });

export function candidatesFor(index: DictIndex, form: string): DictCandidate[] | undefined {
  return index.forms.get(form)?.map((i) => {
    const [lemma, pos, gender, gloss] = index.entries[i];
    return { lemma, pos, gender, gloss };
  });
}

// The rows a song needs; elided forms ("Still'") also get the full form ("stille").
export function lexiconFrom(index: DictIndex, words: Iterable<string>): Lexicon {
  const lex: Lexicon = {};
  for (const w of [...words].flatMap((w) => [w, w + 'e'])) {
    const candidates = candidatesFor(index, w);
    if (candidates) lex[w] = { claude: null, wiktionary: candidates[0], candidates };
  }
  return lex;
}
