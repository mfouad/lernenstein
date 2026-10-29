import type { FormKey, QuestionKind, Token } from '../../types.ts';
import { ACC_PREPS, ACC_PRONOUNS, DAT_PREPS, DAT_PRONOUNS, PAST_FORMS, SEPARABLE_PARTICLES, W_WORDS } from './lexicon.ts';

const PARTICIPLE = /^ge\p{L}+(t|en)$/u;
const ADJ_ENDING = /(e|en|em|er|es)$/;

// Adds grammar forms to each token, using its clause for context.
export function addForms(tokens: Token[], question: QuestionKind, elided: Set<Token>): void {
  const byClause = new Map<number, Token[]>();
  tokens.forEach((t) => {
    const list = byClause.get(t.clause) ?? [];
    list.push(t);
    byClause.set(t.clause, list);
  });

  for (const clause of byClause.values()) {
    const finite = clause.find((t) => t.slot === 2 && t.pos !== 'CONN' && t.pos !== 'PRON' && t.pos !== 'ADV');
    const hasModal = clause.some((t) => t.pos === 'MOD');
    const hasAux = clause.some((t) => t.pos === 'AUX' && t.slot === 2);
    const particle = clause.find((t) => t.slot === 4 && SEPARABLE_PARTICLES.has(t.text.toLowerCase()));

    clause.forEach((t, i) => {
      const f = new Set<FormKey>(t.forms);
      const low = t.text.toLowerCase().replace(/'/g, '');
      const isVerb = t.pos === 'V' || t.pos === 'MOD' || t.pos === 'AUX';

      if (t.pos === 'MOD') f.add('modal');
      if (isVerb && t.slot === 4 && hasModal) f.add('modal');
      if (t === finite && isVerb) f.add(PAST_FORMS.has(low) || /(te|test|ten|tet)$/.test(low) ? 'past' : 'present');
      if (isVerb && t.slot === 4 && hasAux && PARTICIPLE.test(low)) f.add('perfect');
      if (particle && (t === particle || t === finite)) f.add('separable');
      if (t.clauseType === 'sub' && (t.slot === 2 || (t.slot === 4 && isVerb))) f.add('verbFinal');
      if (t.lemma === 'kein') f.add('kein');
      if (t.lemma === 'sich') f.add('reflexive');
      if (ACC_PRONOUNS.has(low) || ACC_PREPS.has(low)) f.add('acc');
      if (DAT_PRONOUNS.has(low) || DAT_PREPS.has(low)) f.add('dat');
      if (question === 'w' && t.slot === 1 && W_WORDS.has(low)) f.add('wQuestion');
      if (question === 'yn' && t === finite) f.add('ynQuestion');
      if (t.pos === 'ADJ' && clause[i + 1]?.pos === 'N' && ADJ_ENDING.test(low)) f.add('adjEnding');
      if (elided.has(t) || /old (form|spelling)/.test(t.gloss)) f.add('poetic');

      t.forms = [...f];
    });
  }
}
