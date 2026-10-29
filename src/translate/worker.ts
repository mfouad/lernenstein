/// <reference lib="webworker" />
import { pipeline, type TranslationPipeline } from '@huggingface/transformers';

// German -> English, fully in the browser. The model downloads once and is
// cached by the browser.
let translator: Promise<TranslationPipeline> | null = null;

function load() {
  translator ??= pipeline('translation', 'Xenova/opus-mt-de-en', {
    dtype: 'q8',
    progress_callback: (p: { status: string; progress?: number }) => {
      if (p.status === 'progress' && p.progress != null) self.postMessage({ type: 'progress', progress: p.progress });
    },
  }) as Promise<TranslationPipeline>;
  return translator;
}

self.onmessage = async (e: MessageEvent<{ id: number; text: string }>) => {
  const { id, text } = e.data;
  try {
    const t = await load();
    const out = await t(text) as { translation_text: string }[];
    self.postMessage({ type: 'result', id, text: out[0]?.translation_text ?? '' });
  } catch (err) {
    self.postMessage({ type: 'error', id, error: String(err) });
  }
};
