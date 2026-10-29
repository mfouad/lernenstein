import type { Pos } from '../../types.ts';

// Per-song word table, as written by scripts/build-glosses.ts (prebuilt
// stand-in for live model calls).
export interface DictCandidate { lemma: string; pos: string; gloss: string; gender?: string }

export type Lexicon = Record<string, {
  claude: string | null;
  wiktionary: { lemma: string; pos: string; gloss: string } | null;
  // All dictionary readings of the form; the best one is picked per token.
  candidates?: DictCandidate[];
}>;

export interface LexEntry {
  lemma: string;
  pos: Pos;
  gloss: string;
  closed: boolean; // from the built-in closed-class table (with its own gloss)
}

const words = (s: string) => s.split(' ');
// form → [pos, lemma, gloss]. These glosses win over the dictionary, whose
// readings for such common forms are many and in no useful order.
const table = new Map<string, [Pos, string, string]>();
const add = (pos: Pos, lemma: string, list: string, gloss: string) => words(list).forEach((w) => table.set(w, [pos, lemma, gloss]));
// "word=gloss|word=gloss", each word its own lemma.
const each = (pos: Pos, pairs: string) => pairs.split('|').forEach((p) => {
  const [w, gloss] = p.split('=');
  table.set(w, [pos, w, gloss]);
});

add('DET', 'der', 'der die den dem des', 'the');
add('DET', 'der', 'das', 'the / that');
add('DET', 'ein', 'ein eine einen einem einer eines', 'a / one');
add('DET', 'ein', 'n nen ne', 'a');
add('DET', 'kein', 'kein keine keinen keinem keiner keines', 'no / not a');
const POSSESSIVE: Record<string, string> = { mein: 'my', dein: 'your', sein: 'his / its', ihr: 'her / their', unser: 'our', euer: 'your (pl.)' };
for (const [p, gloss] of Object.entries(POSSESSIVE)) {
  add('DET', p, ['', 'e', 'en', 'em', 'er', 'es'].map((e) => p + e).join(' '), gloss);
}
add('DET', 'ihr', 'ihr', 'her / their / you (pl.)');
add('DET', 'unser', 'unsre unsern unserm', 'our');
add('DET', 'euer', 'eure euren eurem eurer', 'your (pl.)');
add('DET', 'all', 'alle aller allen allem', 'all / every');
add('DET', 'dieser', 'diese dieser diesen diesem dieses', 'this / these');
add('DET', 'jeder', 'jede jeder jeden jedem jedes', 'every / each');
add('DET', 'mancher', 'manch manche mancher manchen manchem', 'some / many a');
add('PRON', 'ich', 'ich i ick', 'I');
add('PRON', 'ich', 'mich', 'me / myself');
add('PRON', 'ich', 'mir', '(to) me');
add('PRON', 'du', 'du', 'you');
add('PRON', 'du', 'dich', 'you / yourself');
add('PRON', 'du', 'dir', '(to) you');
add('PRON', 'er', 'er', 'he / it');
add('PRON', 'er', 'ihn', 'him / it');
add('PRON', 'er', 'ihm', '(to) him / it');
add('PRON', 'sie', 'sie', 'she / they / them');
add('PRON', 'sie', 'ihnen', '(to) them / you');
add('PRON', 'es', 'es', 'it');
add('PRON', 'wir', 'wir', 'we');
add('PRON', 'wir', 'uns', '(to) us / ourselves');
add('PRON', 'ihr', 'euch', '(to) you (pl.)');
add('PRON', 'sich', 'sich', 'oneself / themselves');
add('PRON', 'man', 'man', 'one / you');
add('PRON', 'wer', 'wer', 'who');
add('PRON', 'wer', 'wen', 'whom');
add('PRON', 'wer', 'wem', '(to) whom');
add('PRON', 'wer', 'wessen', 'whose');
add('PRON', 'was', 'was wat', 'what');
add('PRON', 'niemand', 'niemand', 'nobody');
add('PRON', 'niemand', 'jemand', 'somebody');
add('PRON', 'niemand', 'irgendjemand', 'anybody');
add('PRON', 'nichts', 'nichts', 'nothing');
add('PRON', 'nichts', 'alles', 'everything / all');
add('PRON', 'nichts', 'etwas', 'something');
add('PRON', 'nichts', 'irgendetwas', 'anything');
add('PREP', 'in', 'in', 'in / into');
add('PREP', 'in', 'im', 'in the');
add('PREP', 'in', 'ins', 'into the');
add('PREP', 'an', 'an', 'at / on');
add('PREP', 'an', 'am', 'at / on the');
add('PREP', 'an', 'ans', 'to the');
add('PREP', 'auf', 'auf', 'on / onto');
add('PREP', 'auf', 'aufs aufm', 'on the');
add('PREP', 'zu', 'zum zur', 'to the');
add('PREP', 'von', 'von', 'from / of');
add('PREP', 'von', 'vom', 'from the');
add('PREP', 'bei', 'bei', 'at / with');
add('PREP', 'bei', 'beim', 'at the');
add('PREP', 'durch', 'durch', 'through');
add('PREP', 'durch', 'durchs', 'through the');
each('PREP', 'aus=out of / from|mit=with|nach=after / to|seit=since|gegenüber=opposite|für=for|gegen=against|ohne=without|um=around / at|bis=until|über=over / about|unter=under / among|hinter=behind|neben=next to|zwischen=between|vor=before / in front of|entgegen=towards|wegen=because of|während=during / while|trotz=despite|statt=instead of');
each('CONN', 'und=and|oder=or|aber=but|denn=because / for|sondern=but rather|doch=but / yet');
each('CONN', 'dass=that|daß=that|weil=because|wenn=if / when|ob=whether / if|als=when / than / as|obwohl=although|bevor=before|nachdem=after|damit=so that|sobald=as soon as|solange=as long as|falls=in case');
add('MOD', 'können', 'kann kannst können könnt', 'can');
add('MOD', 'können', 'konnte konnten konntest', 'could');
add('MOD', 'können', 'könnte könnten', 'could / would be able to');
add('MOD', 'müssen', 'muss musst müssen müsst', 'must / have to');
add('MOD', 'müssen', 'musste mussten', 'had to');
add('MOD', 'müssen', 'müsste müssten', 'would have to');
add('MOD', 'wollen', 'will willst wollen wollt wolln', 'want(s) to');
add('MOD', 'wollen', 'wollte wollten', 'wanted to');
add('MOD', 'sollen', 'soll sollst sollen sollt solln', 'should / am to');
add('MOD', 'sollen', 'sollte sollten', 'should / was to');
add('MOD', 'dürfen', 'darf darfst dürfen dürft', 'may / be allowed to');
add('MOD', 'dürfen', 'durfte durften', 'was allowed to');
add('MOD', 'dürfen', 'dürfte', 'might');
add('MOD', 'mögen', 'mag magst mögen', 'like');
add('MOD', 'mögen', 'möchte möchtest möchten', 'would like');
add('AUX', 'sein', 'bin', 'am');
add('AUX', 'sein', 'bist sind seid', 'are');
add('AUX', 'sein', 'ist', 'is');
add('AUX', 'sein', 'war', 'was');
add('AUX', 'sein', 'warst waren', 'were');
add('AUX', 'sein', 'wär wäre wären', 'would be / were');
add('AUX', 'sein', 'sei', 'be / is');
add('AUX', 'haben', 'hab habe hast haben habt ham', 'have');
add('AUX', 'haben', 'hat', 'has');
add('AUX', 'haben', 'hatte hatten', 'had');
add('AUX', 'haben', 'hätte hätten', 'would have / had');
add('AUX', 'werden', 'werde werd wirst werden werdet', 'will / become');
add('AUX', 'werden', 'wird', 'will / becomes');
add('AUX', 'werden', 'wurde wurden', 'became / was');
add('AUX', 'werden', 'würde würden', 'would');
each('ADV', 'nicht=not|nie=never|niemals=never|noch=still / yet|schon=already|auch=also / too|nur=only|immer=always|hier=here|da=there / then|dort=there|dann=then|jetzt=now|nun=now|so=so / like this|sehr=very|nochmal=once more|wieder=again|mal=once / just|gern=gladly|gerne=gladly|bald=soon|oft=often');
each('ADV', 'wo=where|wann=when|warum=why|wie=how / like|wohin=where to|woher=where from|weshalb=why|wieso=why|wozu=what for|wovor=of what');
each('INTJ', 'ja=yes|nein=no|oh=oh|ah=ah|ach=oh|yeah=yeah|ok=okay');

export const SUBORDINATORS = new Set(words('dass daß weil wenn ob als obwohl bevor nachdem damit sobald solange falls'));
export const COORDINATORS = new Set(words('und oder aber denn sondern doch'));
export const W_WORDS = new Set(words('wer wen wem wessen was wo wann warum wie wohin woher weshalb wieso wozu wovor welche welcher welchen welchem welches'));
export const SEPARABLE_PARTICLES = new Set(words('ab an auf aus bei ein mit nach vor weg zu zurück vorbei los hin her fest heim entzwei hinaus hinauf hinein herein heraus fort weiter zusammen dran rein raus rüber'));
export const DAT_PREPS = new Set(words('mit nach bei seit von zu aus gegenüber zum zur vom beim im am'));
export const ACC_PREPS = new Set(words('durch für gegen ohne um ins ans aufs durchs entgegen'));
export const ACC_PRONOUNS = new Set(words('mich dich ihn uns euch'));
export const DAT_PRONOUNS = new Set(words('mir dir ihm ihnen'));
export const PAST_FORMS = new Set(words('war warst waren hatte hatten ging gingen kam kamen sah sahen gab gaben hielt hielten trug grub lag lief rief riefen schrieb blieb blieben fand stand wusste konnte konnten musste wollte wollten sollte durfte wurde wurden dachte brachte'));

const WK_POS: Record<string, Pos> = {
  noun: 'N', name: 'N', verb: 'V', adj: 'ADJ', adv: 'ADV', pron: 'PRON', det: 'DET',
  article: 'DET', prep: 'PREP', postp: 'PREP', conj: 'CONN', particle: 'PRT', num: 'NUM', intj: 'INTJ',
};

// Capitalised away from the line start means noun; otherwise prefer a non-noun reading.
function pick(cands: DictCandidate[], text: string, lineStart: boolean): DictCandidate | undefined {
  const isNoun = (c: DictCandidate) => c.pos === 'noun' || c.pos === 'name';
  if (/^\p{Lu}/u.test(text) && !lineStart) return cands.find(isNoun) ?? cands[0];
  if (lineStart) return cands[0];
  return cands.find((c) => !isNoun(c)) ?? cands[0];
}

export function lookup(norm: string, text: string, lex: Lexicon, lineStart: boolean): LexEntry {
  const closed = table.get(norm);
  // Elided forms ("Still'") fall back to the full form ("stille").
  const row = lex[norm] ?? lex[norm + 'e'];
  const best = row?.candidates?.length ? pick(row.candidates, text, lineStart) : row?.wiktionary ?? undefined;
  if (closed) return { pos: closed[0], lemma: closed[1], gloss: row?.claude ?? closed[2], closed: true };
  const gloss = row?.claude ?? best?.gloss ?? '';
  let pos: Pos = best ? WK_POS[best.pos] ?? 'X' : 'X';
  // German nouns are capitalised: trust that away from the line start.
  if (!lineStart && /^\p{Lu}/u.test(text)) pos = 'N';
  return { pos, lemma: best?.lemma ?? norm, gloss, closed: false };
}
