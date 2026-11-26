import { computeMoments } from './moments';
import { requireFinite, unitInterval, type Distribution, type RandomSource } from './sampler';

/** Empirical distribution over observed samples, stored in sorted order. */
export class EmpiricalDistribution implements Distribution {
  readonly sortedSamples: readonly number[];
  readonly mean: number;
  readonly variance: number;
  readonly support: readonly [number, number];

  constructor(samples: readonly number[]) {
    if (samples.length === 0) throw new RangeError('samples must not be empty');
    for (const sample of samples) requireFinite(sample, 'sample');
    this.sortedSamples = [...samples].sort((left, right) => left - right);
    const moments = computeMoments(samples);
    this.mean = moments.mean;
    this.variance = moments.variance;
    this.support = [this.sortedSamples[0] ?? 0, this.sortedSamples[this.sortedSamples.length - 1] ?? 0];
  }

  sample(rng: RandomSource): number {
    const index = Math.min(
      this.sortedSamples.length - 1,
      Math.floor(unitInterval(rng) * this.sortedSamples.length),
    );
    return this.sortedSamples[index] ?? this.mean;
  }

  /** Fraction of observations less than or equal to `value`. */
  cdf(value: number): number {
    requireFinite(value, 'value');
    let low = 0;
    let high = this.sortedSamples.length;
    while (low < high) {
      const mid = (low + high) >>> 1;
      if ((this.sortedSamples[mid] ?? 0) <= value) low = mid + 1;
      else high = mid;
    }
    return low / this.sortedSamples.length;
  }

  /** Linearly interpolated empirical quantile (type 7). */
  quantile(probability: number): number {
    requireFinite(probability, 'probability');
    const bounded = Math.min(1, Math.max(0, probability));
    const index = bounded * (this.sortedSamples.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const lowValue = this.sortedSamples[lower] ?? 0;
    const highValue = this.sortedSamples[upper] ?? 0;
    return lower === upper ? lowValue : lowValue + (highValue - lowValue) * (index - lower);
  }
}

export function createEmpirical(samples: readonly number[]): EmpiricalDistribution {
  return new EmpiricalDistribution(samples);
}

export function empiricalSample(rng: RandomSource, samples: readonly number[]): number {
  return new EmpiricalDistribution(samples).sample(rng);
}

export function empiricalCdf(samples: readonly number[], value: number): number {
  return new EmpiricalDistribution(samples).cdf(value);
}

export function empiricalQuantile(samples: readonly number[], probability: number): number {
  return new EmpiricalDistribution(samples).quantile(probability);
}
