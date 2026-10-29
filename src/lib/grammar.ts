import type { FormKey, Pos, Slot } from '../types.ts';

export const POS_INFO: Record<Pos, { abbr: string; name: string; hint: string }> = {
  N: { abbr: 'N', name: 'noun', hint: 'Always capitalised; learn it with der, die or das.' },
  V: { abbr: 'V', name: 'verb', hint: 'The conjugated verb sits in slot 2 of a main clause.' },
  AUX: { abbr: 'AUX', name: 'helper verb', hint: 'sein, haben, werden: build tenses and the passive.' },
  MOD: { abbr: 'MOD', name: 'modal verb', hint: 'können, wollen, müssen…: push the main verb to the end.' },
  PRON: { abbr: 'PRON', name: 'pronoun', hint: 'Stands in for a noun; pronouns come early in the middle.' },
  ADJ: { abbr: 'ADJ', name: 'adjective', hint: 'Takes an ending before a noun, none after sein.' },
  ADV: { abbr: 'ADV', name: 'adverb', hint: 'Says how, when or where.' },
  DET: { abbr: 'DET', name: 'article', hint: 'der/die/das, ein, kein, mein…: shows gender and case.' },
  CONN: { abbr: 'CONN', name: 'connector', hint: 'und/aber/denn keep the order; weil/dass send the verb to the end.' },
  PREP: { abbr: 'PREP', name: 'preposition', hint: 'Decides the case of what follows.' },
  PRT: { abbr: 'PRT', name: 'particle', hint: 'Often the detached prefix of a separable verb.' },
  NUM: { abbr: 'NUM', name: 'number', hint: '' },
  INTJ: { abbr: 'INTJ', name: 'interjection', hint: '' },
  X: { abbr: '?', name: 'unknown', hint: 'Not in the word table yet.' },
};

export const SLOT_INFO: Record<Slot, { mark: string; name: string; desc: string }> = {
  0: { mark: '+', name: 'Link', desc: 'und, aber, denn, doch: sit before the clause and change nothing.' },
  1: { mark: '1', name: 'Vorfeld', desc: 'Exactly one block before the verb: subject, object, time or question word.' },
  2: { mark: '2', name: 'Verb', desc: 'The conjugated verb. In a sub clause the connector (dass, weil, was) sits here.' },
  3: { mark: '3', name: 'Middle', desc: 'Pronouns first, then the rest.' },
  4: { mark: '4', name: 'Verb end', desc: 'Infinitives, participles, separable prefixes; in sub clauses the conjugated verb.' },
  5: { mark: '5', name: 'After', desc: 'After the verb bracket: comparisons and add-ons.' },
};

export const FORM_INFO: Record<FormKey, { short: string; name: string }> = {
  present: { short: 'pres', name: 'Present tense' },
  past: { short: 'past', name: 'Simple past' },
  perfect: { short: 'perf', name: 'Perfect tense' },
  acc: { short: 'Akk', name: 'Accusative' },
  dat: { short: 'Dat', name: 'Dative' },
  gen: { short: 'Gen', name: 'Genitive' },
  kein: { short: 'kein', name: 'Negation with kein' },
  modal: { short: 'modal', name: 'Modal + infinitive' },
  separable: { short: 'sep', name: 'Separable verbs' },
  wQuestion: { short: 'W-?', name: 'W-questions' },
  ynQuestion: { short: 'Ja/Nein?', name: 'Yes/no questions' },
  verbFinal: { short: 'end', name: 'Verb-final clauses' },
  reflexive: { short: 'refl', name: 'Reflexive verbs' },
  adjEnding: { short: '-e/-en', name: 'Adjective endings' },
  poetic: { short: 'poet', name: 'Poetic & old forms' },
};

export const FORM_ORDER = Object.keys(FORM_INFO) as FormKey[];

// Shape-based underline per part of speech (works without color).
export const UNDERLINE: Partial<Record<Pos, string>> = {
  N: 'double', V: 'solid', AUX: 'solid', MOD: 'solid', PRT: 'solid', PRON: 'dashed', ADJ: 'dotted', ADV: 'dotted',
};
