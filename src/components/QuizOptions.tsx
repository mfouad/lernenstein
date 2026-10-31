import { useEffect, useState } from 'react';
import type { QuizQuestion } from '../lib/quiz.ts';
import { usePlayback } from '../store/playback.ts';

// The words to pick from under the hidden one. A right pick fills the gap and
// the song carries on; a wrong one is crossed out. If the line ends with no
// right pick, the player plays the line again, or in flow style carries on
// (see PlayerCard).
export function QuizOptions({ line, question, solved }: { line: number; question: QuizQuestion | null; solved: boolean }) {
  const [wrong, setWrong] = useState<string[]>([]);
  useEffect(() => setWrong([]), [line]);

  const pick = (option: string) => {
    if (!question || solved || wrong.includes(option)) return;
    const pb = usePlayback.getState();
    if (option !== question.answer) {
      setWrong((w) => [...w, option]);
      pb.set({ streak: 0, missed: { ...pb.missed, [line]: true } });
      return;
    }
    // A clean answer earns more, and a streak adds a bonus; one that took a
    // wrong pick or came after the line went by earns a little.
    const clean = !pb.missed[line];
    const streak = clean ? pb.streak + 1 : 0;
    const points = clean ? 10 + Math.min(streak - 1, 9) * 2 : 3;
    pb.set({
      solved: { ...pb.solved, [line]: true },
      score: pb.score + points,
      streak,
      best: Math.max(pb.best, streak),
      pop: { id: (pb.pop?.id ?? 0) + 1, points, streak },
    });
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
    <div role="group" aria-label="Pick the hidden word" className="grid grid-cols-2 gap-2.5 md:flex md:h-16 md:items-center md:justify-center md:gap-3 md:overflow-hidden">
      {question.options.map((o, i) => {
        const right = solved && o === question.answer;
        const bad = wrong.includes(o);
        return (
          <button key={o} type="button" disabled={solved || bad} onClick={() => pick(o)}
            className={`flex h-11 min-w-0 cursor-pointer items-center justify-center gap-2.5 rounded-xl border-2 px-3 text-lg font-bold md:h-14 md:justify-start md:px-5 md:text-2xl ${right ? 'border-good bg-surface2 text-good' : bad ? 'border-line text-faint line-through decoration-2 opacity-60' : 'border-line2 bg-surface2 text-ink hover:border-accent'} disabled:cursor-default`}>
            <span className="font-mono text-[11px] font-semibold text-faint">{i + 1}</span><span className="truncate">{o}</span>
          </button>
        );
      })}
    </div>
  );
}
