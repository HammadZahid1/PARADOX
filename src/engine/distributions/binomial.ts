import {
  requireFinite,
  requireInteger,
  standardNormal,
  type Distribution,
  type RandomSource,
} from './sampler';

/** n values up to this bound use the exact Bernoulli-sum path. */
export const NORMAL_APPROX_THRESHOLD = 50;

export interface BinomialMoments {
  mean: number;
  variance: number;
}

function validateBinomial(n: number, probability: number): void {
  requireInteger(n, 'n');
  if (n < 0) throw new RangeError('n must be non-negative');
  requireFinite(probability, 'probability');
  if (probability < 0 || probability > 1) throw new RangeError('probability must be within [0, 1]');
}

export function binomialMoments(n: number, probability: number): BinomialMoments {
  validateBinomial(n, probability);
  return { mean: n * probability, variance: n * probability * (1 - probability) };
}

/**
 * Draw a binomial count. Small n is sampled exactly; larger n uses a rounded
 * normal approximation clamped back to the valid integer range.
 */
export function binomialSample(rng: RandomSource, n: number, probability: number): number {
  validateBinomial(n, probability);
  if (n === 0 || probability <= 0) return 0;
  if (probability >= 1) return n;

  if (n <= NORMAL_APPROX_THRESHOLD) {
    let successes = 0;
    for (let i = 0; i < n; i += 1) {
      if (rng.next() < probability) successes += 1;
    }
    return successes;
  }

  const { mean, variance } = binomialMoments(n, probability);
  if (variance <= 0) return Math.round(mean);
  const estimate = mean + Math.sqrt(variance) * standardNormal(rng);
  return Math.min(n, Math.max(0, Math.round(estimate)));
}

export function createBinomial(n: number, probability: number): Distribution {
  const { mean, variance } = binomialMoments(n, probability);
  return {
    mean,
    variance,
    support: [0, n],
    sample: (rng) => binomialSample(rng, n, probability),
  };
}
