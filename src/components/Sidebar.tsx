import * as Switch from '@radix-ui/react-switch';
import * as Tabs from '@radix-ui/react-tabs';
import * as ToggleGroup from '@radix-ui/react-toggle-group';
import { CircleCheck, EyeOff, Languages, List, Sparkles, Tag, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { FORM_INFO, FORM_ORDER } from '../lib/grammar.ts';
import { useSettings, wordKey, type View } from '../store/settings.ts';
import type { AnalyzedSong, FormKey } from '../types.ts';

const card = 'rounded-2xl border border-line bg-surface p-[18px]';

export function ShowCard() {
  const { view, hideTranslation, hideGrammar, set } = useSettings();
  const views: [View, string, ReactNode][] = [
    ['all', 'All words', <List size={16} />],
    ['new', 'New only', <Sparkles size={16} />],
    ['known', 'Known only', <CircleCheck size={16} />],
    ['nv', 'Nouns + verbs', <Tag size={16} />],
  ];
  return (
    <section className={card}>
      <span className="eyebrow">Show</span>
      <ToggleGroup.Root type="single" value={view} onValueChange={(v) => v && set({ view: v as View })}
        className="mt-3 grid grid-cols-2 gap-1 rounded-[10px] border border-line bg-bg p-[3px]">
        {views.map(([v, label, icon]) => (
          <ToggleGroup.Item key={v} value={v}
            className="flex cursor-pointer items-center gap-2 rounded-[7px] px-2.5 py-2 text-[13px] font-medium text-muted data-[state=on]:bg-surface2 data-[state=on]:text-ink data-[state=on]:shadow-[inset_0_0_0_1px_var(--line2)]">
            {icon}{label}
          </ToggleGroup.Item>
        ))}
      </ToggleGroup.Root>
      <div className="mt-2">
        <SwitchRow icon={<Languages size={15} className="text-en" />} label="Hide translation" checked={hideTranslation} onChange={(v) => set({ hideTranslation: v })} />
        <SwitchRow icon={<EyeOff size={15} style={{ color: 'var(--pos-N)' }} />} label="Hide grammar" checked={hideGrammar} onChange={(v) => set({ hideGrammar: v })} border />
      </div>
    </section>
  );
}

export function FormsCard({ song }: { song: AnalyzedSong | undefined }) {
  const { learned, toggleForm } = useSettings();
  const counts = new Map<FormKey, number>();
  song?.lines.forEach((l) => l.tokens.forEach((t) => t.forms.forEach((f) => counts.set(f, (counts.get(f) ?? 0) + 1))));
  return (
    <section className={card}>
      <span className="eyebrow">Forms I've learned</span>
      <p className="mb-1.5 mt-2 text-[13px] text-muted">Only these get highlighted. Everything else stays plain until you're ready.</p>
      {FORM_ORDER.map((f, i) => (
        <SwitchRow key={f} border={i > 0} checked={learned.includes(f)} onChange={() => toggleForm(f)}
          label={<>{FORM_INFO[f].name} <span className="ml-1 font-mono text-[11px] text-faint">{counts.get(f) ?? 0}×</span></>} />
      ))}
    </section>
  );
}

export function MyWordsCard({ song }: { song: AnalyzedSong | undefined }) {
  const { known, saved, toggleWord } = useSettings();
  const keys = new Set(song?.lines.flatMap((l) => l.tokens.map((t) => wordKey(t.lemma))) ?? []);
  const knownHere = [...keys].filter((k) => known[k]).length;
  const pct = keys.size ? Math.round((knownHere / keys.size) * 100) : 0;

  const exportCsv = () => {
    const rows = [['word', 'lemma', 'gloss', 'pos'], ...Object.values(saved).map((w) => [w.text, w.lemma, w.gloss, w.pos])];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'lernenstein-flashcards.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <section className={card}>
      <div className="flex items-center justify-between">
        <span className="eyebrow">My words</span>
        <span className="font-mono text-xs text-muted">{pct}% of song known</span>
      </div>
      <div className="my-3 h-1.5 rounded-full bg-surface2"><div className="h-1.5 rounded-full bg-good" style={{ width: `${pct}%` }} /></div>
      <Tabs.Root defaultValue="saved">
        <div className="mb-2 flex items-center gap-1.5">
          <Tabs.List className="flex gap-1.5">
            {(['saved', 'known'] as const).map((t) => (
              <Tabs.Trigger key={t} value={t}
                className="cursor-pointer rounded-full border border-transparent px-3 py-1 text-[13px] font-semibold text-muted data-[state=active]:border-line2 data-[state=active]:bg-surface2 data-[state=active]:text-ink">
                {t === 'saved' ? `Saved · ${Object.keys(saved).length}` : `Known · ${Object.keys(known).length}`}
              </Tabs.Trigger>
            ))}
          </Tabs.List>
          <button type="button" onClick={exportCsv} disabled={!Object.keys(saved).length}
            className="ml-auto cursor-pointer rounded-lg border border-line2 px-2.5 py-1 text-xs font-semibold text-muted disabled:opacity-40">Export CSV</button>
        </div>
        {(['saved', 'known'] as const).map((list) => {
          const items = Object.values(list === 'saved' ? saved : known);
          return (
            <Tabs.Content key={list} value={list}>
              <ul className="m-0 max-h-64 list-none overflow-auto p-0">
                {items.length === 0 && <li className="py-2 text-[13px] text-faint">{list === 'saved' ? 'Hover a word and press the bookmark to save it.' : 'Hover a word and press ✓ once you know it.'}</li>}
                {items.map((w) => (
                  <li key={w.key} className="flex items-center gap-2.5 border-t border-line py-2">
                    <span className="font-bold" style={{ color: `var(--pos-${w.pos})` }}>{w.lemma}</span>
                    <span className="flex-1 text-[13px] text-muted">{w.gloss}</span>
                    <button type="button" aria-label={`Remove ${w.lemma}`} onClick={() => toggleWord(list, w)}
                      className="grid size-6 cursor-pointer place-items-center rounded-lg text-muted hover:text-ink"><X size={13} /></button>
                  </li>
                ))}
              </ul>
            </Tabs.Content>
          );
        })}
      </Tabs.Root>
    </section>
  );
}

function SwitchRow({ label, checked, onChange, icon, border }: { label: ReactNode; checked: boolean; onChange: (v: boolean) => void; icon?: ReactNode; border?: boolean }) {
  return (
    <label className={`flex cursor-pointer items-center gap-2.5 py-2.5 text-sm ${border ? 'border-t border-line' : ''}`}>
      {icon && <span className="grid size-7 place-items-center rounded-lg bg-surface2">{icon}</span>}
      <span className="flex-1">{label}</span>
      <Switch.Root checked={checked} onCheckedChange={onChange}
        className="relative h-5 w-9 shrink-0 cursor-pointer rounded-full bg-line2 p-0.5 data-[state=checked]:bg-accent">
        <Switch.Thumb className="block size-4 rounded-full bg-white transition-transform data-[state=checked]:translate-x-4" />
      </Switch.Root>
    </label>
  );
}
