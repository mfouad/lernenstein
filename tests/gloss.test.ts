import { describe, expect, it } from 'vitest';
import { shortGloss, shortTranslation } from '../src/lib/gloss.ts';

describe('shortGloss', () => {
  it('keeps the first option and drops notes', () => {
    expect(shortGloss('her / you (pl.) / their', 'PRON')).toBe('her');
    expect(shortGloss('will / become', 'AUX')).toBe('will');
    expect(shortGloss('little town (dialect)', 'N')).toBe('little town');
  });

  it('drops "to" on verbs only', () => {
    expect(shortGloss('to give (as a gift)', 'V')).toBe('give');
    expect(shortGloss('to the', 'PREP')).toBe('to the');
  });

  it('keeps a clitic "+ it"', () => {
    expect(shortGloss('to have / own + it', 'V')).toBe('have + it');
  });
});

describe('shortTranslation', () => {
  it('picks the first option in brackets and drops "to"', () => {
    expect(shortTranslation('my friend (wrote/sent) (to me) a letter')).toBe('my friend wrote me a letter');
  });

  it('drops notes and keeps the first of a / b', () => {
    expect(shortTranslation('I will / become her (pl.) friend')).toBe('I will her friend');
  });
});
