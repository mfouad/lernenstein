import { useEffect, useState } from 'react';
import type { QuizQuestion } from '../lib/quiz.ts';
import { usePlayback } from '../store/playback.ts';

// The words to pick from under the hidden one. A right pick fills the gap and
// the song carries on; a wrong one is crossed out. If the line ends with no
// right pick, the player plays the line again (see PlayerCard).
export function QuizOptions({ line, question, solved }: { line: number; question: QuizQuestion | null; solved: boolean }) {
  const [wrong, setWrong] = useState<string[]>([]);
  useEffect(() => setWrong([]), [line]);

  const pick = (option: string) => {
    if (!question || solved || wrong.includes(option)) return;
    if (option !== question.answer) { setWrong((w) => [...w, option]); return; }
    const pb = usePlayback.getState();
    pb.set({ solved: { ...pb.solved, [line]: true } });
  };

  // 1–4 pick an option.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || (e.target as HTMLElement).closest('input, textarea, select')) return;
      const option = question?.options[Number(e.key) - 1];
      if (option) pick(option);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!question) return <div className="h-16" />;
  return (
    <div role="group" aria-label="Pick the hidden word" className="flex h-16 items-center justify-center gap-3 overflow-hidden">
      {question.options.map((o, i) => {
        const right = solved && o === question.answer;
        const bad = wrong.includes(o);
        return (
          <button key={o} type="button" disabled={solved || bad} onClick={() => pick(o)}
            className={`flex h-14 min-w-0 cursor-pointer items-center gap-2.5 rounded-xl border-2 px-5 text-2xl font-bold ${right ? 'border-good bg-surface2 text-good' : bad ? 'border-line text-faint line-through decoration-2 opacity-60' : 'border-line2 bg-surface2 text-ink hover:border-accent'} disabled:cursor-default`}>
            <span className="font-mono text-[11px] font-semibold text-faint">{i + 1}</span><span className="truncate">{o}</span>
          </button>
        );
      })}
    </div>
  );
}
