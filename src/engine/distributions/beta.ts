import { gammaSample } from './gamma';
import { requirePositive, type Distribution, type RandomSource } from './sampler';

export interface BetaMoments {
  mean: number;
  variance: number;
}

function validateBeta(alpha: number, beta: number): void {
  requirePositive(alpha, 'alpha');
  requirePositive(beta, 'beta');
}

export function betaMoments(alpha: number, beta: number): BetaMoments {
  validateBeta(alpha, beta);
  const total = alpha + beta;
  return {
    mean: alpha / total,
    variance: (alpha * beta) / (total * total * (total + 1)),
  };
}

/** Beta via two independent Gamma(alpha, 1) and Gamma(beta, 1) draws. */
export function betaSample(rng: RandomSource, alpha: number, beta: number): number {
  validateBeta(alpha, beta);
  const x = gammaSample(rng, alpha, 1);
  const y = gammaSample(rng, beta, 1);
  const total = x + y;
  if (!(total > 0) || !Number.isFinite(total)) return 0.5;
  return x / total;
}

export function createBeta(alpha: number, beta: number): Distribution {
  const { mean, variance } = betaMoments(alpha, beta);
  return {
    mean,
    variance,
    support: [0, 1],
    sample: (rng) => betaSample(rng, alpha, beta),
  };
}
