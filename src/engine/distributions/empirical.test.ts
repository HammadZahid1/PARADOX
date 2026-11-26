import { describe, expect, it } from 'vitest';
import { SeededRandom } from '@/engine/random/rng';
import {
  createEmpirical,
  empiricalCdf,
  empiricalQuantile,
  empiricalSample,
  EmpiricalDistribution,
} from './empirical';

const seeded = (seed = 12345): SeededRandom => new SeededRandom(seed);

describe('empirical', () => {
  it('sorts observations and reports cdf and quantiles', () => {
    const distribution = createEmpirical([4, 1, 3, 2]);
    expect(distribution.sortedSamples).toEqual([1, 2, 3, 4]);
    expect(distribution.cdf(0)).toBe(0);
    expect(distribution.cdf(1)).toBe(0.25);
    expect(distribution.cdf(2.5)).toBe(0.5);
    expect(distribution.cdf(10)).toBe(1);
    expect(distribution.quantile(0)).toBe(1);
    expect(distribution.quantile(0.5)).toBe(2.5);
    expect(distribution.quantile(1)).toBe(4);
    expect(empiricalCdf([3, 1], 2)).toBe(0.5);
    expect(empiricalQuantile([3, 1], 0.25)).toBe(1.5);
  });

  it('reports moments and support from observed samples', () => {
    const distribution = new EmpiricalDistribution([1, 2, 3, 4]);
    expect(distribution.mean).toBe(2.5);
    expect(distribution.variance).toBeCloseTo(1.25, 12);
    expect(distribution.support).toEqual([1, 4]);
  });

  it('samples only observed values and is reproducible', () => {
    const samples = [1, 2, 3, 4];
    const distribution = createEmpirical(samples);
    const values = Array.from({ length: 500 }, () => distribution.sample(seeded()));
    expect(values.every((value) => samples.includes(value))).toBe(true);
    expect(Array.from({ length: 32 }, () => empiricalSample(seeded(808), samples))).toEqual(
      Array.from({ length: 32 }, () => empiricalSample(seeded(808), samples)),
    );
  });

  it('validates input samples and query values', () => {
    expect(() => createEmpirical([])).toThrow(RangeError);
    expect(() => createEmpirical([1, Number.NaN])).toThrow(RangeError);
    expect(() => createEmpirical([1, 2]).cdf(Number.POSITIVE_INFINITY)).toThrow(RangeError);
    expect(() => createEmpirical([1, 2]).quantile(Number.NaN)).toThrow(RangeError);
  });
});
