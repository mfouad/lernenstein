// Sync points pair a lyrics-line time with the video time at which that line is sung.
// Between points the mapping is linear (absorbs tempo drift); outside them it keeps the
// nearest point's offset. No points means lyrics clock = video clock.
export interface SyncPoint {
  line: number; // line.time, seconds
  video: number; // player time, seconds
}

function interp(x: number, xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n === 0) return x;
  if (x <= xs[0]) return x + (ys[0] - xs[0]);
  if (x >= xs[n - 1]) return x + (ys[n - 1] - xs[n - 1]);
  let i = 1;
  while (xs[i] < x) i++;
  const span = xs[i] - xs[i - 1];
  return span > 0 ? ys[i - 1] + ((x - xs[i - 1]) / span) * (ys[i] - ys[i - 1]) : ys[i];
}

export const videoToLine = (video: number, pts: SyncPoint[]) =>
  interp(video, pts.map((p) => p.video), pts.map((p) => p.line));

export const lineToVideo = (line: number, pts: SyncPoint[]) =>
  interp(line, pts.map((p) => p.line), pts.map((p) => p.video));

// Add or replace the point for a line; keep the list ordered by line time.
export function addPoint(pts: SyncPoint[], p: SyncPoint): SyncPoint[] {
  return [...pts.filter((q) => q.line !== p.line), p].sort((a, b) => a.line - b.line);
}
