import { clamp, mean, safeDivide, standardDeviation } from '@/utils/math';

export interface AutocorrelationResult {
  /** Non-negative integer lag used for the calculation. */
  lag: number;
  /** Pearson coefficient between samples separated by lag; descriptive only. */
  coefficient: number;
  /** Number of overlapping sample pairs. */
  pairCount: number;
  /** A constant series has no variation, so its coefficient is guarded to 0. */
  constant: boolean;
}

function normalizedLag(lag: number): number {
  return Number.isFinite(lag) ? Math.max(0, Math.floor(lag)) : 0;
}

/**
 * Correlation of a series with itself shifted by `lag` steps. This describes
 * temporal association only: it is not evidence of causation or prediction.
 */
export function autocorrelationReport(values: readonly number[], lag = 1): AutocorrelationResult {
  const samples = values.filter((value) => Number.isFinite(value));
  const normalized = normalizedLag(lag);
  const constant = samples.length === 0 || standardDeviation(samples) === 0;

  if (constant || normalized >= samples.length) {
    return { lag: normalized, coefficient: 0, pairCount: 0, constant };
  }
  if (normalized === 0) {
    return { lag: 0, coefficient: 1, pairCount: samples.length, constant };
  }

  const left = samples.slice(0, samples.length - normalized);
  const right = samples.slice(normalized);
  const leftMean = mean(left);
  const rightMean = mean(right);
  const leftStd = standardDeviation(left);
  const rightStd = standardDeviation(right);
  if (leftStd === 0 || rightStd === 0) {
    return { lag: normalized, coefficient: 0, pairCount: left.length, constant };
  }

  const covariance = left.reduce(
    (sum, value, index) => sum + (value - leftMean) * ((right[index] ?? rightMean) - rightMean),
    0,
  );
  const coefficient = clamp(safeDivide(covariance / left.length, leftStd * rightStd), -1, 1);
  return { lag: normalized, coefficient, pairCount: left.length, constant };
}

/** Lag-N autocorrelation coefficient; a descriptive association, not a causal effect. */
export function autocorrelation(values: readonly number[], lag = 1): number {
  return autocorrelationReport(values, lag).coefficient;
}
