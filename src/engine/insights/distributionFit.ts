import { mean, safeDivide, standardDeviation } from '@/utils/math';

export type DistributionKind = 'normal' | 'uniform';

export interface DistributionMoments {
  count: number;
  mean: number;
  variance: number;
  stdDev: number;
  /** Third standardized moment of the sample. */
  skew: number;
  min: number;
  max: number;
}

export interface DistributionFit {
  kind: DistributionKind;
  observed: DistributionMoments;
  reference: DistributionMoments;
  /** Absolute mean gap scaled by the reference standard deviation. */
  meanDeviation: number;
  /** Absolute variance gap scaled by the reference variance. */
  varianceDeviation: number;
  /** Absolute skew gap; skew itself is dimensionless. */
  skewDeviation: number;
  /** Average of the three deviations; smaller means a closer descriptive match. */
  score: number;
  /** Explicit label: these are descriptive deviations, not significance tests. */
  note: 'descriptive-only';
}

/** Population moments of the finite samples in a series. */
export function sampleMoments(values: readonly number[]): DistributionMoments {
  const samples = values.filter((value) => Number.isFinite(value));
  if (samples.length === 0) {
    return { count: 0, mean: 0, variance: 0, stdDev: 0, skew: 0, min: 0, max: 0 };
  }

  const average = mean(samples);
  const stdDev = standardDeviation(samples);
  const variance = stdDev ** 2;
  let min = samples[0] ?? 0;
  let max = min;
  let thirdMoment = 0;
  for (const value of samples) {
    if (value < min) min = value;
    if (value > max) max = value;
    thirdMoment += (value - average) ** 3;
  }
  const skew = stdDev === 0 ? 0 : safeDivide(thirdMoment / samples.length, stdDev ** 3);

  return { count: samples.length, mean: average, variance, stdDev, skew, min, max };
}

function referenceMoments(observed: DistributionMoments, kind: DistributionKind): DistributionMoments {
  if (kind === 'normal') {
    // A normal reference shares the observed centre and spread and has zero skew.
    return { ...observed, skew: 0 };
  }
  // A uniform reference is defined by the observed range.
  const range = observed.max - observed.min;
  const variance = range ** 2 / 12;
  return {
    ...observed,
    mean: (observed.min + observed.max) / 2,
    variance,
    stdDev: Math.sqrt(variance),
    skew: 0,
  };
}

/** Compare a sample series to reference moments without claiming significance or causation. */
export function fitDistribution(values: readonly number[], kind: DistributionKind): DistributionFit {
  const observed = sampleMoments(values);
  const reference = referenceMoments(observed, kind);
  const meanDeviation = safeDivide(Math.abs(observed.mean - reference.mean), reference.stdDev || 1);
  const varianceDeviation = safeDivide(Math.abs(observed.variance - reference.variance), reference.variance || 1);
  const skewDeviation = Math.abs(observed.skew - reference.skew);

  return {
    kind,
    observed,
    reference,
    meanDeviation,
    varianceDeviation,
    skewDeviation,
    score: (meanDeviation + varianceDeviation + skewDeviation) / 3,
    note: 'descriptive-only',
  };
}

/** Both descriptive fits ordered from closest to furthest by deviation score. */
export function compareDistributionFits(values: readonly number[]): DistributionFit[] {
  return [fitDistribution(values, 'normal'), fitDistribution(values, 'uniform')]
    .sort((left, right) => left.score - right.score);
}
