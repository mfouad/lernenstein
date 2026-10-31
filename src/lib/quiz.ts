import type { AnalyzedSong, Token } from '../types.ts';

// Quiz mode hides one word per line and offers a few words from the same song
// to pick from. The words are chosen up front, from the song itself.
export type QuizKind = 'noun' | 'verb' | 'pronoun' | 'link';

// What share of the quiz word list each kind gets.
export const QUIZ_SHARE: Record<QuizKind, number> = { noun: 0.4, verb: 0.4, pronoun: 0.1, link: 0.1 };

const OPTIONS = 4;
const MIN_OPTIONS = 3;
const PERSONAL = new Set(['ich', 'du', 'er', 'sie', 'es', 'wir', 'ihr']);

export interface QuizQuestion {
  index: number; // position of the hidden word in the line's tokens
  answer: string; // what the options show for it
  options: string[]; // the answer and its distractors, shuffled
  kind: QuizKind;
}

// Plain words only: letters, a gloss to show, nothing with an apostrophe,
// hyphen or other mark. Long words are fine.
function kindOf(t: Token): QuizKind | null {
  if (!t.gloss.trim() || !/^\p{L}+$/u.test(t.text)) return null;
  if (t.pos === 'N') return 'noun';
  if (t.pos === 'V' || t.pos === 'MOD' || t.pos === 'AUX') return 'verb';
  if (t.pos === 'PRON') return PERSONAL.has(t.lemma.toLowerCase()) ? 'pronoun' : null;
  if (t.pos === 'CONN' || t.pos === 'PREP') return 'link';
  return null;
}

const keyOf = (t: Token) => t.lemma.toLowerCase();

// Nouns keep their capital, everything else is shown in lower case, so a
// capital at the start of a line doesn't give the answer away.
export const quizLabel = (t: Token) => (t.pos === 'N' ? t.text : t.text.toLowerCase());

interface Entry { kind: QuizKind; count: number; labels: Map<string, number> }

// Every plain word of the song that can be quizzed, by kind and lemma.
function collect(song: AnalyzedSong): Map<string, Entry> {
  const all = new Map<string, Entry>();
  for (const line of song.lines) {
    for (const t of line.tokens) {
      const kind = kindOf(t);
      if (!kind) continue;
      const key = `${kind}:${t.lemma.toLowerCase()}`;
      const e = all.get(key) ?? { kind, count: 0, labels: new Map() };
      e.count++;
      e.labels.set(quizLabel(t), (e.labels.get(quizLabel(t)) ?? 0) + 1);
      all.set(key, e);
    }
  }
  return all;
}

// The song's words per kind, by lemma, favouring the most repeated: 40% nouns, 40% verbs,
// 10% personal pronouns and 10% links (und, auf, von…), as many as the song
// has for the scarcer of nouns and verbs.
export function quizWords(song: AnalyzedSong, all = collect(song), seed?: number): Map<string, Entry> {
  // With a seed, the words are drawn at random, the more repeated ones more
  // likely (weighted sampling: key = -ln(u) / count, smallest first).
  const rand = seed === undefined ? null : rng(seed);
  const rank = (e: Entry) => (rand ? -Math.log(1 - rand()) / e.count : -e.count);
  const byKind = (k: QuizKind) => [...all.entries()].filter(([, e]) => e.kind === k)
    .map((x) => [rank(x[1]), x] as const).sort((a, b) => a[0] - b[0]).map(([, x]) => x);
  const pool = { noun: byKind('noun'), verb: byKind('verb'), pronoun: byKind('pronoun'), link: byKind('link') };
  const size = Math.min(Math.floor(pool.noun.length / QUIZ_SHARE.noun), Math.floor(pool.verb.length / QUIZ_SHARE.verb));
  const list = new Map<string, Entry>();
  for (const k of Object.keys(pool) as QuizKind[]) {
    pool[k].slice(0, Math.round(size * QUIZ_SHARE[k])).forEach(([key, e]) => list.set(key, e));
  }
  return list;
}

const topLabel = (e: Entry) => [...e.labels.entries()].sort((a, b) => b[1] - a[1])[0][0];

// A small seeded random source, so a line keeps its word and options between renders.
function rng(seed: number): () => number {
  let s = seed + 0x9e3779b9;
  return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

function shuffle<T>(items: T[], seed: number): T[] {
  const out = [...items];
  const rand = rng(seed);
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}

const cache = new WeakMap<AnalyzedSong, (QuizQuestion | null)[]>();

// One question per line (or null where the line has no quiz word). Each line
// hides a word of the kind furthest below its share of the questions so far,
// so the questions follow the 40/40/10/10 split too. Which word of that kind,
// and the distractors, depend on the seed: a new one each time a song is
// loaded, kept for as long as that song stays loaded.
export function buildQuiz(song: AnalyzedSong, seed?: number): (QuizQuestion | null)[] {
  const fresh = seed === undefined;
  if (fresh) {
    const hit = cache.get(song);
    if (hit) return hit;
  }
  seed ??= Math.floor(Math.random() * 2 ** 31);
  const all = collect(song);
  const list = quizWords(song, all, seed);
  const asked: Record<QuizKind, number> = { noun: 0, verb: 0, pronoun: 0, link: 0 };
  const hidden = new Set<string>(); // words already hidden, so repeats (a chorus) hide others
  const quiz = song.lines.map((line, li) => {
    if (line.tokens.length < 2) return null; // nothing left to read around the gap
    const need = (k: QuizKind) => (asked[k] + 1) / QUIZ_SHARE[k];
    let found: { i: number; kind: QuizKind }[] = [];
    // Words from the list first; a line with none of them hides any other plain word.
    for (const source of [list, all]) {
      let cands: { i: number; kind: QuizKind }[] = [];
      line.tokens.forEach((t, i) => {
        const kind = kindOf(t);
        if (kind && source.has(`${kind}:${t.lemma.toLowerCase()}`)) cands.push({ i, kind });
      });
      if (!cands.length) continue;
      const fresh = cands.filter((c) => !hidden.has(keyOf(line.tokens[c.i])));
      if (fresh.length) cands = fresh; // otherwise every word was hidden before: reuse
      const kind = cands.reduce((m, c) => (need(c.kind) < need(m.kind) ? c : m)).kind;
      found = cands.filter((c) => c.kind === kind);
      break;
    }
    if (!found.length) return null;
    const { i, kind } = found[Math.floor(rng(seed + li)() * found.length)];
    hidden.add(keyOf(line.tokens[i]));
    const answer = quizLabel(line.tokens[i]);
    // Other words from the list, the same kind first, none that the line already has.
    const inLine = new Set(line.tokens.map(quizLabel));
    const fit = (e: Entry) => !inLine.has(topLabel(e)) && topLabel(e) !== answer;
    const others = [...list.values()].filter(fit);
    const rest = [...all.values()].filter((e) => fit(e) && !others.includes(e)); // when the list is too short
    const picks = [...shuffle(others.filter((e) => e.kind === kind), seed + li), ...shuffle(others.filter((e) => e.kind !== kind), seed + li + 1), ...shuffle(rest, seed + li + 3)];
    const options = [answer];
    for (const e of picks) { if (options.length < OPTIONS && !options.includes(topLabel(e))) options.push(topLabel(e)); }
    if (options.length < MIN_OPTIONS) return null;
    asked[kind]++;
    return { index: i, answer, options: shuffle(options, seed + li + 2), kind };
  });
  if (fresh) cache.set(song, quiz);
  return quiz;
}
