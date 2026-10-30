import { shortTranslation } from '../lib/gloss.ts';
import { useSettings } from '../store/settings.ts';

// Machine translation (src/translate/) is switched off for now: its ONNX wasm
// is over Cloudflare's 25 MiB asset limit. Not importing it keeps it out of
// the build. Re-enable by calling translateLine() here again.
export function LineTranslation({ given, fallback }: { text: string; given?: string; fallback: string }) {
  const { hideTranslation } = useSettings();
  const shown = given ? shortTranslation(given) : fallback;
  return (
    <div className="mt-2.5 flex flex-wrap items-baseline gap-3">
      <p className={`m-0 text-xl text-muted transition md:text-2xl ${hideTranslation ? 'cursor-pointer blur-sm hover:blur-none' : ''} ${given ? '' : 'italic'}`}>
        {shown || ' '}
      </p>
    </div>
  );
}
