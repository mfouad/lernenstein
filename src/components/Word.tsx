import * as HoverCard from '@radix-ui/react-hover-card';
import { BookmarkPlus, Check } from 'lucide-react';
import type { CSSProperties } from 'react';
import { shortGloss } from '../lib/gloss.ts';
import { FORM_INFO, POS_INFO, UNDERLINE } from '../lib/grammar.ts';
import { useSettings, wordKey, type SavedWord } from '../store/settings.ts';
import type { Pos, Token } from '../types.ts';

const NOUNS_VERBS: Pos[] = ['N', 'V', 'AUX', 'MOD', 'PRT'];
// Keep their chip even when their forms (adjective endings…) aren't learned yet.
const ALWAYS_CHIP: Pos[] = ['ADJ', 'X'];

export function Word({ token, size }: { token: Token; size: 'lg' | 'sm' }) {
  const s = useSettings();
  const key = wordKey(token.lemma);
  const known = !!s.known[key];
  const saved = !!s.saved[key];
  const learnedForms = token.forms.filter((f) => s.learned.includes(f));
  const quiet = s.hideGrammar || (token.forms.length > 0 && learnedForms.length === 0);
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
    <HoverCard.Root openDelay={120} closeDelay={150}>
      <HoverCard.Trigger asChild>
        <span
          tabIndex={0}
          style={style}
          className={`group relative inline-flex flex-col items-start rounded-xl outline-none transition-opacity hover:bg-surface2 focus-visible:bg-surface2 ${big ? 'gap-[0.12em] -m-2 p-2' : 'gap-0.5 -m-1 p-1'} ${dim ? 'opacity-20 hover:opacity-70' : ''}`}
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
            <span className={`font-semibold ${big ? 'text-[max(0.75rem,0.34em)]' : 'text-xs'} ${showColor || underline ? 'text-muted' : 'text-en'}`}>{en ? token.text : gloss}</span>
          )}
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
      </HoverCard.Trigger>
      <HoverCard.Portal>
        <HoverCard.Content side="bottom" align="start" sideOffset={10} collisionPadding={12} className="z-50 w-80 rounded-2xl border border-line2 bg-surface p-4 text-[13px] text-muted shadow-2xl">
          <WordCard token={token} word={word} known={known} saved={saved} />
          <HoverCard.Arrow className="fill-surface" />
        </HoverCard.Content>
      </HoverCard.Portal>
    </HoverCard.Root>
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

function WordCard({ token, word, known, saved }: { token: Token; word: SavedWord; known: boolean; saved: boolean }) {
  const { learned, toggleWord } = useSettings();
  const pos = POS_INFO[token.pos];
  return (
    <div style={{ '--c': `var(--pos-${token.pos})` } as CSSProperties}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-2xl font-extrabold leading-tight text-(--c)">{token.text}</div>
          <div className="mt-1 font-mono text-xs text-muted">{token.lemma}</div>
        </div>
        <div className="flex gap-1.5">
          <button type="button" onClick={() => toggleWord('saved', word)} aria-pressed={saved}
            className={`flex cursor-pointer items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${saved ? 'border-en text-en' : 'border-line2 text-ink'}`}>
            <BookmarkPlus size={13} />{saved ? 'Saved' : 'Save'}
          </button>
          <button type="button" onClick={() => toggleWord('known', word)} aria-pressed={known}
            className={`flex cursor-pointer items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${known ? 'border-good text-good' : 'border-line2 text-ink'}`}>
            <Check size={13} strokeWidth={2.6} />{known ? 'Known' : 'I know it'}
          </button>
        </div>
      </div>
      <div className="mb-3 mt-2.5 text-lg font-semibold text-en">{token.gloss || 'No gloss yet'}</div>
      <div className="flex gap-2.5 border-t border-line py-2">
        <span className="h-fit rounded-full border border-line2 px-1.5 font-mono text-[10px] font-semibold">{pos.abbr}</span>
        <span><b className="text-ink">{pos.name}</b>{pos.hint && ` — ${pos.hint}`}</span>
      </div>
      {token.forms.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-t border-line pt-2.5">
          {token.forms.map((f) => {
            const on = learned.includes(f);
            return (
              <span key={f} className={`rounded-full border border-dashed px-2 py-0.5 font-mono text-[10px] font-semibold ${on ? 'border-(--c) text-(--c)' : 'border-line2 text-faint'}`}>
                {FORM_INFO[f].name}{on ? '' : ' · not learned'}
              </span>
            );
          })}
        </div>
      )}
      <div className="mt-3 font-mono text-[11px] text-faint">Analysed on this device · may be wrong</div>
    </div>
  );
}
