import { BookOpenText, CircleHelp, Languages, Music, type LucideIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const SLIDES: { Icon: LucideIcon; title: string; text: string }[] = [
  { Icon: Music, title: 'Learn German from songs you love', text: 'Pick a song, press play, and read the lyrics line by line while the official video plays beside them.' },
  { Icon: Languages, title: 'Every word explained', text: 'A small English gloss sits under each word, and grammar is colour-coded: verbs, nouns, connectors and more.' },
  { Icon: CircleHelp, title: 'Quiz yourself', text: 'Switch to the quiz and fill in the missing word or pick the right translation, line by line, in time with the music.' },
  { Icon: BookOpenText, title: 'Build your own word list', text: 'Save words you want to remember. Everything runs in your browser, and nothing you do leaves your device.' },
];

const INTERVAL_MS = 6000;

// A banner that explains the app. Scroll-snap does the sliding, so swiping works natively.
export function PitchCarousel() {
  const track = useRef<HTMLUListElement>(null);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const goTo = (i: number) => track.current?.scrollTo({ left: i * track.current.clientWidth, behavior: 'smooth' });

  useEffect(() => {
    if (paused || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => goTo((index + 1) % SLIDES.length), INTERVAL_MS);
    return () => clearInterval(t);
  }, [index, paused]);

  return (
    <section aria-roledescription="carousel" aria-label="How Lernenstein works" className="mb-6 overflow-hidden rounded-2xl border border-line bg-surface"
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
      <ul ref={track} onScroll={(e) => setIndex(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
        className="m-0 flex list-none snap-x snap-mandatory overflow-x-auto p-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {SLIDES.map(({ Icon, title, text }, i) => (
          <li key={title} aria-roledescription="slide" aria-label={`${i + 1} of ${SLIDES.length}`}
            className="flex min-w-full snap-center items-center gap-4 px-5 py-5 md:gap-6 md:px-8 md:py-6">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-surface2 text-accent md:size-16"><Icon size={26} /></span>
            <div className="min-w-0">
              <h2 className="m-0 text-lg font-extrabold tracking-tight md:text-2xl">{title}</h2>
              <p className="m-0 mt-1 text-sm text-muted md:text-base">{text}</p>
            </div>
          </li>
        ))}
      </ul>
      <div className="flex justify-center gap-1 pb-2">
        {SLIDES.map(({ title }, i) => (
          <button key={title} type="button" aria-label={`Show slide ${i + 1}`} aria-current={i === index} onClick={() => goTo(i)}
            className="grid size-6 cursor-pointer place-items-center border-0 bg-transparent p-0">
            <span className={`block h-2 rounded-full transition-all ${i === index ? 'w-5 bg-accent' : 'w-2 bg-line2'}`} />
          </button>
        ))}
      </div>
    </section>
  );
}
