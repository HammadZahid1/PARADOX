import type { DistributionStatistics } from '@/engine/types';
import { mean, quantile, safeDivide, standardDeviation } from '@/utils/math';

const BIN_COUNT = 12;

interface HistogramBounds {
  start: number;
  end: number;
}

/** Expand degenerate/empty ranges so bin edges stay finite and non-zero in width. */
function safeBounds(min: number, max: number): HistogramBounds {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { start: 0, end: 1 };
  if (min !== max) return { start: min, end: max };
  const padding = Math.max(0.5, Math.abs(min) * 0.01);
  return { start: min - padding, end: max + padding };
}

function buildHistogram(values: readonly number[], min: number, max: number): DistributionStatistics['histogram'] {
  const { start, end } = safeBounds(min, max);
  const width = safeDivide(end - start, BIN_COUNT, 1);
  const bins = Array.from({ length: BIN_COUNT }, (_, index) => ({
    binStart: start + index * width,
    binEnd: index === BIN_COUNT - 1 ? end : start + (index + 1) * width,
    count: 0,
  }));

  for (const value of values) {
    const rawIndex = Math.floor(safeDivide(value - start, width));
    const index = Math.min(BIN_COUNT - 1, Math.max(0, rawIndex));
    const bin = bins[index];
    if (bin) bin.count += 1;
  }
  return bins;
}

/**
 * Descriptive statistics for a batch of simulation outcomes.
 * Non-finite inputs are ignored so every returned field remains numeric.
 */
export function computeDistributionStatistics(values: readonly number[]): DistributionStatistics {
  const samples = values.filter((value) => typeof value === 'number' && Number.isFinite(value));
  const count = samples.length;
  const avg = mean(samples);
  const stdDev = standardDeviation(samples, true);

  let min = 0;
  let max = 0;
  if (count > 0) {
    min = samples[0] ?? 0;
    max = min;
    for (const value of samples) {
      if (value < min) min = value;
      if (value > max) max = value;
    }
  }

  const margin = 1.96 * safeDivide(stdDev, Math.sqrt(count));

  return {
    count,
    mean: avg,
    median: quantile(samples, 0.5),
    stdDev,
    min,
    max,
    p05: quantile(samples, 0.05),
    p25: quantile(samples, 0.25),
    p75: quantile(samples, 0.75),
    p95: quantile(samples, 0.95),
    ci95Low: avg - margin,
    ci95High: avg + margin,
    histogram: buildHistogram(samples, min, max),
  };
}
