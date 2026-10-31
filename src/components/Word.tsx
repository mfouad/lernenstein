import { BookmarkPlus, Check } from 'lucide-react';
import type { CSSProperties } from 'react';
import { shortGloss } from '../lib/gloss.ts';
import { POS_INFO, UNDERLINE } from '../lib/grammar.ts';
import { useSettings, wordKey, type SavedWord } from '../store/settings.ts';
import type { Pos, Token } from '../types.ts';

const NOUNS_VERBS: Pos[] = ['N', 'V', 'AUX', 'MOD', 'PRT'];
// Keep their chip even when their forms (adjective endings…) aren't learned yet.
const ALWAYS_CHIP: Pos[] = ['ADJ', 'X'];

// Gloss text per size step (the settings' glossSize). Large words scale with the word size.
const GLOSS_LG = ['text-[max(0.75rem,0.34em)]', 'text-[max(1.1rem,0.5em)]', 'text-[max(1.4rem,0.65em)]'];
const GLOSS_SM = ['text-xs', 'text-base', 'text-xl'];

export function Word({ token, size, blank }: { token: Token; size: 'lg' | 'sm'; blank?: boolean }) {
  const s = useSettings();
  const key = wordKey(token.lemma);
  const known = !!s.known[key];
  const saved = !!s.saved[key];
  const learnedForms = token.forms.filter((f) => s.learned.includes(f));
  const quiet = s.hideGrammar || s.gstyle === 'plain' || (token.forms.length > 0 && learnedForms.length === 0);
  const dim = (s.view === 'new' && known) || (s.view === 'known' && !known) || (s.view === 'nv' && !NOUNS_VERBS.includes(token.pos));
  const word: SavedWord = { key, text: token.text, lemma: token.lemma, gloss: token.gloss, pos: token.pos };

  const style = {
    '--c': `var(--pos-${token.pos})`,
  } as CSSProperties;
  const showColor = !quiet && s.gstyle === 'color';
  const underline = !quiet && s.gstyle === 'underline' ? UNDERLINE[token.pos] : undefined;
  const big = size === 'lg';
  // English mode swaps the two lines: the gloss is the main word, the German sits below.
  const en = s.main === 'en';
  const gloss = token.gloss ? shortGloss(token.gloss, token.pos) : '—';

  return (
    <span
      tabIndex={0}
      style={style}
      className={`group relative inline-flex flex-col items-start rounded-xl outline-none ${blank ? 'pointer-events-none [&>*]:invisible' : ''} transition-opacity hover:bg-surface2 focus-visible:bg-surface2 ${big ? 'gap-[0.12em] -m-2 p-2' : 'gap-0.5 -m-1 p-1'} ${dim ? 'opacity-20 hover:opacity-70' : ''}`}
    >
        {(!quiet || (!s.hideGrammar && ALWAYS_CHIP.includes(token.pos))) && s.gstyle === 'chips' && (
          <span className="rounded-full bg-(--c) px-2 py-0.5 font-mono text-[10px] font-bold tracking-wide text-on">{POS_INFO[token.pos].abbr}</span>
        )}
        <span
          className={`font-extrabold tracking-tight leading-none ${big ? 'text-(length:--word-size,3.75rem)' : 'text-xl'} ${showColor ? 'text-(--c)' : ''}`}
          style={underline ? { textDecorationLine: 'underline', textDecorationStyle: underline as CSSProperties['textDecorationStyle'], textDecorationColor: 'var(--c)', textDecorationThickness: big ? 4 : 2, textUnderlineOffset: big ? 12 : 5 } : undefined}
        >
          {en ? gloss : token.text}
        </span>
        {!s.hideTranslation && (
          <span className={`font-semibold ${(big ? GLOSS_LG : GLOSS_SM)[s.glossSize ?? 0]} ${showColor || underline ? 'text-muted' : 'text-en'}`}>{en ? token.text : gloss}</span>
        )}
        {blank && <span data-testid="quiz-blank" aria-label="Hidden word" className="!visible absolute inset-x-2 bottom-1 h-1 rounded-full border-b-4 border-dashed border-accent" />}
        {(known || saved) && (
          <span className="absolute -right-1 -top-1 flex gap-0.5 group-hover:opacity-0">
            {saved && <span className="size-2 rounded-full bg-en" />}
            {known && <span className="size-2 rounded-full bg-good" />}
          </span>
        )}
        {big && (
          <span className="absolute -right-4 -top-4 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
            <ActionButton label="Save to flashcards" on={saved} onClick={() => s.toggleWord('saved', word)} tone="en"><BookmarkPlus size={15} /></ActionButton>
            <ActionButton label="Mark as known" on={known} onClick={() => s.toggleWord('known', word)} tone="good"><Check size={15} strokeWidth={2.6} /></ActionButton>
          </span>
        )}
    </span>
  );
}

function ActionButton({ label, on, onClick, tone, children }: { label: string; on: boolean; onClick: () => void; tone: 'en' | 'good'; children: React.ReactNode }) {
  const onCls = tone === 'en' ? 'border-en text-en' : 'border-good text-good';
  return (
    <button type="button" aria-label={label} aria-pressed={on} title={label} onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={`grid size-8 place-items-center rounded-full border bg-surface ${on ? onCls : 'border-line2 text-ink'} cursor-pointer`}>
      {children}
    </button>
  );
}
