/** Numeric helpers for moving averages; non-finite samples are always ignored. */

function finiteSamples(values: readonly number[]): number[] {
  const samples: number[] = [];
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) samples.push(value);
  }
  return samples;
}

function normalizeWindow(window: number, length: number): number {
  const requested = Number.isFinite(window) ? Math.floor(window) : 1;
  return Math.max(1, Math.min(length, requested));
}

/**
 * Simple moving average with one output per finite sample. Leading outputs use
 * the available prefix until the window fills. Invalid windows fall back to 1,
 * and windows larger than the series are clamped to its length.
 */
export function simpleMovingAverage(values: readonly number[], window: number): number[] {
  const samples = finiteSamples(values);
  if (samples.length === 0) return [];

  const width = normalizeWindow(window, samples.length);
  const averages: number[] = [];
  let sum = 0;
  for (let index = 0; index < samples.length; index += 1) {
    sum += samples[index] ?? 0;
    if (index >= width) sum -= samples[index - width] ?? 0;
    averages.push(sum / Math.min(index + 1, width));
  }
  return averages;
}

/**
 * Exponentially weighted moving average with one output per finite sample.
 * The alpha factor is clamped to [0, 1] (non-finite values act as 0), and the
 * seed defaults to the first sample. A non-finite seed is also replaced by the
 * first sample.
 */
export function exponentialMovingAverage(values: readonly number[], alpha: number, seed?: number): number[] {
  const samples = finiteSamples(values);
  if (samples.length === 0) return [];

  const factor = Number.isFinite(alpha) ? Math.min(1, Math.max(0, alpha)) : 0;
  const first = samples[0] ?? 0;
  const initial = typeof seed === 'number' && Number.isFinite(seed) ? seed : first;
  const averages: number[] = [initial];

  let previous = initial;
  for (let index = 1; index < samples.length; index += 1) {
    previous = factor * (samples[index] ?? 0) + (1 - factor) * previous;
    averages.push(previous);
  }
  return averages;
}
