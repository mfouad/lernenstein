import { db } from '../sources/db.ts';

let worker: Worker | null = null;
let nextId = 0;
const pending = new Map<number, { resolve: (t: string) => void; reject: (e: Error) => void }>();
const progressListeners = new Set<(p: number) => void>();

function getWorker() {
  if (!worker) {
    worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e) => {
      const m = e.data;
      if (m.type === 'progress') progressListeners.forEach((l) => l(m.progress));
      if (m.type === 'result') { pending.get(m.id)?.resolve(m.text); pending.delete(m.id); }
      if (m.type === 'error') { pending.get(m.id)?.reject(new Error(m.error)); pending.delete(m.id); }
    };
  }
  return worker;
}

export function onModelProgress(listener: (p: number) => void) {
  progressListeners.add(listener);
  return () => { progressListeners.delete(listener); };
}

// Translations of lyric lines are kept on the device only.
export async function translateLine(text: string): Promise<string> {
  const cached = await db.translations.get(text);
  if (cached) return cached.text;
  const id = nextId++;
  const result = await new Promise<string>((resolve, reject) => {
    pending.set(id, { resolve, reject });
    getWorker().postMessage({ id, text });
  });
  await db.translations.put({ key: text, text: result });
  return result;
}
