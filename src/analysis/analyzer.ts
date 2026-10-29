import type { AnalyzedSong, LibraryItem } from '../types.ts';
import type { CachedText } from '../sources/db.ts';
import { dictionaryLexicon } from './dictionary.ts';
import { analyzeLocal } from './local/analyze.ts';
import type { Lexicon } from './local/lexicon.ts';
import { vocabulary } from './local/tokenize.ts';

// data/prebuilt/glosses/<slug>.json is a git-ignored stand-in for live model
// calls that only exists on a dev machine. When present, its glosses win;
// the Wiktionary dictionary fills in everything else.
async function loadPrebuilt(slug: string): Promise<Lexicon> {
  if (!import.meta.env.DEV) return {};
  try {
    const res = await fetch(`/data/prebuilt/glosses/${slug}.json`);
    if (!res.ok) return {};
    return (await res.json()).words ?? {};
  } catch {
    return {};
  }
}

export async function analyze(item: LibraryItem, text: CachedText): Promise<AnalyzedSong> {
  const words = vocabulary(text.lines.map((l) => l.text));
  const [dict, prebuilt] = await Promise.all([dictionaryLexicon(words), loadPrebuilt(item.slug)]);
  const lex: Lexicon = { ...dict };
  for (const [w, row] of Object.entries(prebuilt)) {
    lex[w] = { claude: row.claude, wiktionary: row.wiktionary ?? dict[w]?.wiktionary ?? null, candidates: dict[w]?.candidates };
  }
  return analyzeLocal(item.slug, text.lines, lex);
}
