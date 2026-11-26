import { requireFinite, standardNormal, type Distribution, type RandomSource } from './sampler';

export interface LogNormalParams {
  mu: number;
  sigma: number;
}

export interface LogNormalMoments {
  mean: number;
  variance: number;
}

/** Convert arithmetic mean/stdDev into the underlying normal's mu/sigma. */
export function logNormalParamsFromMeanStd(mean: number, stdDev: number): LogNormalParams {
  requireFinite(mean, 'mean');
  requireFinite(stdDev, 'stdDev');
  if (mean <= 0) throw new RangeError('mean must be positive');
  if (stdDev < 0) throw new RangeError('stdDev must be non-negative');
  const ratio = stdDev / mean;
  const logVariance = Math.log1p(ratio * ratio);
  return { mu: Math.log(mean) - logVariance / 2, sigma: Math.sqrt(logVariance) };
}

/** Arithmetic mean and variance of the log-normal with underlying normal parameters. */
export function logNormalMoments(mu: number, sigma: number): LogNormalMoments {
  requireFinite(mu, 'mu');
  requireFinite(sigma, 'sigma');
  if (sigma < 0) throw new RangeError('sigma must be non-negative');
  const sigmaSquared = sigma * sigma;
  return {
    mean: Math.exp(mu + sigmaSquared / 2),
    variance: (Math.exp(sigmaSquared) - 1) * Math.exp(2 * mu + sigmaSquared),
  };
}

/** Draw a log-normal value with underlying normal parameters mu/sigma. */
export function logNormalSample(rng: RandomSource, mu: number, sigma: number): number {
  requireFinite(mu, 'mu');
  requireFinite(sigma, 'sigma');
  if (sigma < 0) throw new RangeError('sigma must be non-negative');
  if (sigma === 0) return Math.exp(mu);
  return Math.exp(mu + sigma * standardNormal(rng));
}

/** Build a Distribution from the observable mean and standard deviation. */
export function createLogNormal(mean: number, stdDev: number): Distribution {
  const { mu, sigma } = logNormalParamsFromMeanStd(mean, stdDev);
  const moments = logNormalMoments(mu, sigma);
  return {
    mean: moments.mean,
    variance: moments.variance,
    support: [0, Number.POSITIVE_INFINITY],
    sample: (rng) => logNormalSample(rng, mu, sigma),
  };
}
