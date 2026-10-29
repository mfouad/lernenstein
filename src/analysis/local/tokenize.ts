export interface RawToken {
  text: string;
  // Lowercased, apostrophes normalised, elision and clitic removed.
  norm: string;
  line: number;
  kind: 'word' | 'punct';
  // "wenn's" -> clitic "es"; "Kron'" -> elided "e".
  clitic?: 'es';
  elided?: boolean;
}

const segmenter = new Intl.Segmenter('de', { granularity: 'word' });

const APOSTROPHES = /[’ʼ‘`´]/g;

export function tokenizeLine(text: string, line = 0): RawToken[] {
  const clean = text.replace(APOSTROPHES, "'");
  const out: RawToken[] = [];
  for (const seg of segmenter.segment(clean)) {
    const s = seg.segment;
    if (!s.trim()) continue;
    if (!seg.isWordLike) {
      // A lone apostrophe right after a word marks elision ("Still'").
      const prev = out[out.length - 1];
      if (s === "'" && prev?.kind === 'word' && !prev.clitic) {
        prev.text += "'";
        prev.elided = true;
        continue;
      }
      out.push({ text: s, norm: s, line, kind: 'punct' });
      continue;
    }
    out.push(wordToken(s, line));
  }
  return out;
}

function wordToken(s: string, line: number): RawToken {
  const lower = s.toLowerCase();
  if (lower.endsWith("'s") && lower.length > 2) {
    return { text: s, norm: lower.slice(0, -2), line, kind: 'word', clitic: 'es' };
  }
  if (lower.includes("'")) {
    return { text: s, norm: lower.replace(/'/g, ''), line, kind: 'word', elided: true };
  }
  return { text: s, norm: lower, line, kind: 'word' };
}

export function tokenizeText(lines: string[]): RawToken[][] {
  return lines.map((l, i) => tokenizeLine(l, i));
}

// Unordered set of lowercase word forms, used to build the dictionary.
export function vocabulary(lines: string[]): Set<string> {
  const set = new Set<string>();
  for (const line of lines) {
    for (const t of tokenizeLine(line)) {
      if (t.kind !== 'word') continue;
      set.add(t.norm);
      if (t.elided) set.add(t.norm + 'e');
    }
  }
  return set;
}
