import { toNumericValue } from '@/engine/analytics/trajectories';
import type { VariableTrajectory } from '@/engine/types';
import { clamp, mean, safeDivide, standardDeviation } from '@/utils/math';

export interface SensitivityOptions {
  /** Longest source-leading lag to examine, in steps (default: 3). */
  maxLag?: number;
}

/**
 * Descriptive association between two trajectories. These numbers must not be
 * reported as causal influence: correlation and temporal precedence alone do
 * not identify a mechanism, confounders, or an intervention effect.
 */
export interface SensitivityEstimate {
  sourceKey: string;
  targetKey: string;
  /** Pearson correlation of samples aligned at the same step. */
  correlation: number;
  /** Strongest absolute correlation found with the source leading the target. */
  laggedCorrelation: number;
  /** Lag in steps producing `laggedCorrelation`; 0 means no lead. */
  bestLag: number;
  /** Number of aligned same-step pairs. */
  pairCount: number;
  /** Explicit label so downstream views cannot present this as causal. */
  interpretation: 'descriptive-only';
}

interface AlignedPair {
  step: number;
  source: number;
  target: number;
}

function pearson(left: readonly number[], right: readonly number[]): number {
  if (left.length < 2 || left.length !== right.length) return 0;
  const leftMean = mean(left);
  const rightMean = mean(right);
  const leftStd = standardDeviation(left);
  const rightStd = standardDeviation(right);
  if (leftStd === 0 || rightStd === 0) return 0;

  const covariance = left.reduce(
    (sum, value, index) => sum + (value - leftMean) * ((right[index] ?? rightMean) - rightMean),
    0,
  );
  return clamp(safeDivide(covariance / left.length, leftStd * rightStd), -1, 1);
}

/** Estimate same-step and lagged association between paired trajectory samples. */
export function estimateSensitivity(
  source: VariableTrajectory,
  target: VariableTrajectory,
  options: SensitivityOptions = {},
): SensitivityEstimate {
  const sourceByStep = new Map<number, number>();
  for (const point of source.points) {
    const value = toNumericValue(point.value);
    if (value !== null && Number.isFinite(value)) sourceByStep.set(point.step, value);
  }

  const pairs: AlignedPair[] = [];
  for (const point of target.points) {
    const sourceValue = sourceByStep.get(point.step);
    const targetValue = toNumericValue(point.value);
    if (sourceValue === undefined || targetValue === null || !Number.isFinite(targetValue)) continue;
    pairs.push({ step: point.step, source: sourceValue, target: targetValue });
  }

  const correlation = pearson(pairs.map((pair) => pair.source), pairs.map((pair) => pair.target));
  const rawMaxLag = options.maxLag;
  const maxLag = typeof rawMaxLag === 'number' && Number.isFinite(rawMaxLag)
    ? Math.max(0, Math.floor(rawMaxLag))
    : 3;

  let bestLag = 0;
  let laggedCorrelation = correlation;
  let bestMagnitude = Math.abs(correlation);

  for (let lag = 1; lag <= maxLag; lag += 1) {
    const leadingValues: number[] = [];
    const targetValues: number[] = [];
    for (const pair of pairs) {
      const leading = sourceByStep.get(pair.step - lag);
      if (leading === undefined) continue;
      leadingValues.push(leading);
      targetValues.push(pair.target);
    }
    const coefficient = pearson(leadingValues, targetValues);
    // Prefer the shortest lag when coefficients tie up to floating-point noise.
    if (Math.abs(coefficient) - bestMagnitude > 1e-12) {
      bestMagnitude = Math.abs(coefficient);
      laggedCorrelation = coefficient;
      bestLag = lag;
    }
  }

  return {
    sourceKey: source.key,
    targetKey: target.key,
    correlation,
    laggedCorrelation,
    bestLag,
    pairCount: pairs.length,
    interpretation: 'descriptive-only',
  };
}
