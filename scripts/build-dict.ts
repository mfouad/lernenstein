// Builds public/dict/de-en.json from the German Wiktionary export
// (kaikki.org, CC BY-SA). Covers all of German Wiktionary, never a song's
// vocabulary, so nothing here can be tied to any lyrics.
//
// One file: { v, e: [[lemma, pos, gender, gloss], …], f: { form: [entryIndex, …] } }
// v (a content hash) and the byte size also go to src/analysis/dictVersion.json,
// so the app knows when its cached copy is stale without downloading the file.
//
// Input: .cache/kaikki-de.jsonl from
// https://kaikki.org/dictionary/German/kaikki.org-dictionary-German.jsonl
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import { joinGlosses, orderForForm } from './dict-utils.ts';

const root = new URL('../', import.meta.url);
const SRC = new URL('.cache/kaikki-de.jsonl', root);
const OUT = new URL('public/dict/', root);

const KEEP_POS = new Set(['noun', 'name', 'verb', 'adj', 'adv', 'pron', 'det', 'article', 'prep', 'postp', 'conj', 'particle', 'num', 'intj', 'contraction']);
const SKIP_FORM_TAGS = new Set(['table-tags', 'inflection-template', 'class', 'auxiliary', 'romanization', 'error-unrecognized-form']);
const NOUN_SKIP_TAGS = new Set(['definite', 'indefinite', 'canonical']);
const MAX_PER_FORM = 4;

type Entry = [lemma: string, pos: string, gender: string, gloss: string];
const entries: Entry[] = [];
const forms = new Map<string, number[]>();
const alts = new Map<number, string>(); // entry id → the word it is a spelling of
const aliases = new Map<string, string>(); // form-only spellings: form → the form it spells

function gender(e: { head_templates?: { expansion?: string }[]; senses: { tags?: string[] }[] }, word: string): string {
  const exp = e.head_templates?.[0]?.expansion ?? '';
  const m = exp.slice(word.length).match(/^\s+([mfn])(?:\s|,|$|\()/);
  if (m) return m[1];
  const tags = e.senses[0]?.tags ?? [];
  return tags.includes('masculine') ? 'm' : tags.includes('feminine') ? 'f' : tags.includes('neuter') ? 'n' : '';
}

const pastParticiples = new Set<string>(); // `${form} ${id}`
const addForm = (form: string, id: number, pastParticiple = false) => {
  const key = form.toLowerCase();
  if (pastParticiple) pastParticiples.add(`${key} ${id}`);
  if (!key || key.includes(' ') || key.length > 40) return;
  // Keep every reading here; ordering and the limit come at the end, so a
  // pronoun table listing "sie" under er/du/ich can't crowd out sie itself.
  const list = forms.get(key) ?? [];
  if (!list.includes(id)) list.push(id);
  forms.set(key, list);
};

let read = 0;
const rl = createInterface({ input: createReadStream(SRC), crlfDelay: Infinity });
for await (const line of rl) {
  read++;
  const e = JSON.parse(line);
  if (e.lang_code !== 'de' || !KEEP_POS.has(e.pos)) continue;
  const senses = (e.senses ?? []).filter((s: { glosses?: string[]; form_of?: unknown; alt_of?: unknown; tags?: string[] }) =>
    s.glosses?.length && !s.form_of && !s.alt_of && !s.tags?.some((t) => t === 'form-of' || t === 'alt-of' || t === 'misspelling'));
  // A sense's last gloss is the specific one; earlier ones are headers ("As a copulative verb:").
  const gloss = joinGlosses(senses.map((s: { glosses: string[] }) => s.glosses[s.glosses.length - 1]));
  // Old or alternative spellings ("thun" for tun) carry their own forms
  // ("gethan"): keep them and borrow the target's gloss at the end.
  const altOf: string | undefined = gloss ? undefined : e.senses?.find((s: { alt_of?: { word: string }[]; tags?: string[] }) =>
    s.alt_of?.length && !s.tags?.includes('misspelling'))?.alt_of[0].word.split(' ')[0];
  if (!gloss && altOf && !e.forms?.length) aliases.set(e.word.toLowerCase(), altOf.toLowerCase()); // "faßt" → fasst
  if (!gloss && !(altOf && e.forms?.length)) continue; // inflected-form entries: covered by their lemma's forms
  const id = entries.push([e.word, e.pos, gender(e, e.word), gloss]) - 1;
  if (altOf) alts.set(id, altOf);
  addForm(e.word, id);
  const isNoun = e.pos === 'noun' || e.pos === 'name';
  for (const f of e.forms ?? []) {
    const tags: string[] = f.tags ?? [];
    // Nouns list their articles ("die", "des") as forms; those aren't readings of the noun.
    if (tags.some((t) => SKIP_FORM_TAGS.has(t) || (isNoun && NOUN_SKIP_TAGS.has(t)))) continue;
    addForm(f.form, id, e.pos === 'verb' && tags.includes('participle') && tags.includes('past'));
  }
}

const glossOf = new Map<string, string>();
for (const [lemma, pos, , gloss] of entries) if (gloss && !glossOf.has(`${lemma} ${pos}`)) glossOf.set(`${lemma} ${pos}`, gloss);
for (const [id, target] of alts) entries[id][3] = glossOf.get(`${target} ${entries[id][1]}`) ?? '';

const f: Record<string, number[]> = {};
for (const [form, all] of forms) {
  const ids = all.filter((id) => entries[id][3]); // alt spellings whose target wasn't found
  if (ids.length) f[form] = orderForForm(form, ids, (id) => ({
    lemma: entries[id][0], pos: entries[id][1], pastParticiple: pastParticiples.has(`${form} ${id}`),
  }), MAX_PER_FORM);
}
for (const [alias, target] of aliases) if (!f[alias] && f[target]) f[alias] = [...f[target]];

// Drop entries no form points at any more, renumbering the rest.
const remap = new Map<number, number>();
const kept: Entry[] = [];
for (const ids of Object.values(f)) {
  ids.forEach((id, i) => {
    if (!remap.has(id)) remap.set(id, kept.push(entries[id]) - 1);
    ids[i] = remap.get(id)!;
  });
}

const body = JSON.stringify({ e: kept, f });
const v = createHash('sha256').update(body).digest('hex').slice(0, 12);
const json = `{"v":"${v}",${body.slice(1)}`;
const bytes = Buffer.byteLength(json);

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });
await writeFile(new URL('de-en.json', OUT), json);
await writeFile(new URL('src/analysis/dictVersion.json', root), JSON.stringify({ version: v, bytes }, null, 2) + '\n');
await writeFile(new URL('ATTRIBUTION.md', OUT), `# Dictionary data

The files in this folder are derived from [Wiktionary](https://en.wiktionary.org/)
via the [kaikki.org](https://kaikki.org/) machine-readable export
(wiktextract, Tatu Ylonen, "Wiktextract: Wiktionary as Machine-Readable
Structured Data", LREC 2022).

They are licensed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/),
not under the project's MIT license. Rebuild with \`npm run build:dict\`.
`);
console.log(`${read} entries read, ${kept.length} kept, ${forms.size} word forms, ${(bytes / 1e6).toFixed(1)} MB, version ${v}`);
