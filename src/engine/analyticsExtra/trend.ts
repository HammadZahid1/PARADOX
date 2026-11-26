/** Classification labels for a finite numeric series. */
export type TrendKind = 'flat' | 'increasing' | 'decreasing' | 'cyclic';

export interface TrendOptions {
  /** Minimum absolute least-squares slope per step to call a trend (default 0.01). */
  threshold?: number;
  /** Sign changes required to call a flat-slope series cyclic (default 2). */
  minSignChanges?: number;
  /** Consecutive differences at or below this magnitude do not change sign (default 0). */
  noiseThreshold?: number;
}

export interface TrendResult {
  trend: TrendKind;
  /** Least-squares slope per sample index. */
  slope: number;
  signChanges: number;
}

function optionOrDefault(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback;
}

/**
 * Classify a series using its least-squares slope and the number of sign
 * changes in consecutive differences. Non-finite samples are ignored. A
 * series is cyclic when its slope is flat and it has enough sign changes;
 * otherwise its slope determines increasing/decreasing/flat.
 */
export function classifyTrend(values: readonly number[], options: TrendOptions = {}): TrendResult {
  const samples: number[] = [];
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) samples.push(value);
  }
  if (samples.length === 0) return { trend: 'flat', slope: 0, signChanges: 0 };

  const threshold = optionOrDefault(options.threshold, 0.01);
  const minSignChanges = Math.max(1, Math.floor(optionOrDefault(options.minSignChanges, 2)));
  const noiseThreshold = optionOrDefault(options.noiseThreshold, 0);

  let total = 0;
  for (const value of samples) total += value;
  const meanValue = total / samples.length;
  const meanIndex = (samples.length - 1) / 2;
  let numerator = 0;
  let denominator = 0;
  for (let index = 0; index < samples.length; index += 1) {
    const centeredIndex = index - meanIndex;
    numerator += centeredIndex * ((samples[index] ?? 0) - meanValue);
    denominator += centeredIndex ** 2;
  }
  const slope = denominator === 0 ? 0 : numerator / denominator;

  let signChanges = 0;
  let previousSign = 0;
  for (let index = 1; index < samples.length; index += 1) {
    const difference = (samples[index] ?? 0) - (samples[index - 1] ?? 0);
    if (Math.abs(difference) <= noiseThreshold) continue;
    const sign = difference > 0 ? 1 : -1;
    if (previousSign !== 0 && sign !== previousSign) signChanges += 1;
    previousSign = sign;
  }

  let trend: TrendKind;
  if (Math.abs(slope) <= threshold && signChanges >= minSignChanges) trend = 'cyclic';
  else if (slope > threshold) trend = 'increasing';
  else if (slope < -threshold) trend = 'decreasing';
  else trend = 'flat';
  return { trend, slope, signChanges };
}
