import { requirePositive, standardNormal, unitInterval, type Distribution, type RandomSource } from './sampler';

/** Safety valve for the Marsaglia–Tsang acceptance loop. */
export const GAMMA_MAX_ATTEMPTS = 1000;

export interface GammaMoments {
  mean: number;
  variance: number;
}

function validateGamma(shape: number, scale: number): void {
  requirePositive(shape, 'shape');
  requirePositive(scale, 'scale');
}

export function gammaMoments(shape: number, scale: number): GammaMoments {
  validateGamma(shape, scale);
  return { mean: shape * scale, variance: shape * scale * scale };
}

/** Gamma sampler using Marsaglia–Tsang, with the shape < 1 boost step. */
export function gammaSample(rng: RandomSource, shape: number, scale: number): number {
  validateGamma(shape, scale);

  if (shape < 1) {
    const boost = Math.pow(unitInterval(rng), 1 / shape);
    return gammaSample(rng, shape + 1, scale) * boost;
  }

  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  for (let attempt = 0; attempt < GAMMA_MAX_ATTEMPTS; attempt += 1) {
    const x = standardNormal(rng);
    const adjusted = 1 + c * x;
    if (adjusted <= 0) continue;
    const v = adjusted * adjusted * adjusted;
    const u = unitInterval(rng);
    const threshold = 1 - 0.0331 * x * x * x * x;
    if (u < threshold || Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) {
      return d * v * scale;
    }
  }
  return d * scale;
}

export function createGamma(shape: number, scale: number): Distribution {
  const { mean, variance } = gammaMoments(shape, scale);
  return {
    mean,
    variance,
    support: [0, Number.POSITIVE_INFINITY],
    sample: (rng) => gammaSample(rng, shape, scale),
  };
}
