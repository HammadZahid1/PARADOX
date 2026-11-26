import { requireFinite, requireInteger, type RandomSource } from './sampler';

export type BoundedSampler = (rng: RandomSource) => number;

export const DEFAULT_MAX_ATTEMPTS = 1000;

function validateBounds(lower: number, upper: number): void {
  requireFinite(lower, 'lower');
  requireFinite(upper, 'upper');
  if (lower >= upper) throw new RangeError('lower must be less than upper');
}

/** Rejection-sample a bounded sampler, failing after `maxAttempts` rejects. */
export function truncatedSample(
  rng: RandomSource,
  sample: BoundedSampler,
  lower: number,
  upper: number,
  maxAttempts: number = DEFAULT_MAX_ATTEMPTS,
): number {
  validateBounds(lower, upper);
  requireInteger(maxAttempts, 'maxAttempts');
  if (maxAttempts <= 0) throw new RangeError('maxAttempts must be positive');

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const value = sample(rng);
    if (value >= lower && value <= upper) return value;
  }
  throw new Error(`truncated sampling exceeded ${maxAttempts} attempts`);
}

/** Create a reusable wrapper that enforces the same bounds on every draw. */
export function truncatedSampler(
  sample: BoundedSampler,
  lower: number,
  upper: number,
  maxAttempts: number = DEFAULT_MAX_ATTEMPTS,
): BoundedSampler {
  return (rng) => truncatedSample(rng, sample, lower, upper, maxAttempts);
}
