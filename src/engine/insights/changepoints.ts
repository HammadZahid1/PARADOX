import { mean } from '@/utils/math';

export interface ChangepointOptions {
  /** Minimum absolute before/after mean shift required (default: 0). */
  threshold?: number;
  /** Maximum number of ranked candidates to return (default: 3). */
  topN?: number;
}

export interface Changepoint {
  /** Index of the first sample after the shift, between it and its predecessor. */
  index: number;
  beforeMean: number;
  afterMean: number;
  /** Signed shift (after - before). */
  shift: number;
  /** Absolute shift used for ranking. */
  magnitude: number;
}

/**
 * Rank the largest mean shifts between consecutive samples. Candidates are
 * descriptive breakpoints in the observed series; they do not imply that any
 * event or variable caused the shift. Non-finite samples are ignored.
 */
export function detectChangepoints(values: readonly number[], options: ChangepointOptions = {}): Changepoint[] {
  const samples = values.filter((value) => Number.isFinite(value));
  if (samples.length < 2) return [];

  const rawThreshold = options.threshold;
  const threshold = typeof rawThreshold === 'number' && Number.isFinite(rawThreshold) ? rawThreshold : 0;
  const rawTopN = options.topN;
  const topN = typeof rawTopN === 'number' && Number.isFinite(rawTopN) ? Math.max(0, Math.floor(rawTopN)) : 3;
  if (topN === 0) return [];

  const candidates: Changepoint[] = [];
  for (let index = 1; index < samples.length; index += 1) {
    const beforeMean = mean(samples.slice(0, index));
    const afterMean = mean(samples.slice(index));
    const shift = afterMean - beforeMean;
    const magnitude = Math.abs(shift);
    if (magnitude >= threshold) {
      candidates.push({ index, beforeMean, afterMean, shift, magnitude });
    }
  }

  candidates.sort((left, right) => right.magnitude - left.magnitude || left.index - right.index);
  return candidates.slice(0, topN);
}
