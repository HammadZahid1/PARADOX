/** Finite-only descriptive summary of a numeric series. */
export interface DescriptiveSummary {
  count: number;
  min: number;
  max: number;
  mean: number;
  median: number;
  /** Population variance (denominator is count, not count - 1). */
  variance: number;
  /** Square root of the population variance. */
  stdDev: number;
  p05: number;
  p95: number;
}

/** Linear-interpolation quantile over an already sorted series. */
function quantile(sorted: readonly number[], p: number): number {
  if (sorted.length === 0) return 0;
  const position = p * (sorted.length - 1);
  const low = Math.floor(position);
  const high = Math.ceil(position);
  const lowValue = sorted[low] ?? 0;
  const highValue = sorted[high] ?? 0;
  return lowValue + (highValue - lowValue) * (position - low);
}

/**
 * Summarize a finite numeric series. Non-finite values are ignored; an empty
 * (or entirely invalid) series produces an all-zero summary.
 */
export function summarizeSeries(values: readonly number[]): DescriptiveSummary {
  const samples: number[] = [];
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) samples.push(value);
  }

  const count = samples.length;
  if (count === 0) {
    return { count: 0, min: 0, max: 0, mean: 0, median: 0, variance: 0, stdDev: 0, p05: 0, p95: 0 };
  }

  let min = samples[0] ?? 0;
  let max = min;
  let total = 0;
  for (const value of samples) {
    if (value < min) min = value;
    if (value > max) max = value;
    total += value;
  }
  const mean = total / count;

  let squaredDeviations = 0;
  for (const value of samples) squaredDeviations += (value - mean) ** 2;
  const variance = squaredDeviations / count;

  const sorted = [...samples].sort((left, right) => left - right);
  return {
    count,
    min,
    max,
    mean,
    median: quantile(sorted, 0.5),
    variance,
    stdDev: Math.sqrt(variance),
    p05: quantile(sorted, 0.05),
    p95: quantile(sorted, 0.95),
  };
}
