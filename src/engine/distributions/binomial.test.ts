import { describe, expect, it } from 'vitest';
import { SeededRandom } from '@/engine/random/rng';
import {
  binomialMoments,
  binomialSample,
  createBinomial,
  NORMAL_APPROX_THRESHOLD,
} from './binomial';
import { sampleMany, type RandomSource } from './sampler';

const seeded = (seed = 12345): SeededRandom => new SeededRandom(seed);
const sequence = (values: readonly number[]): RandomSource => {
  let index = 0;
  return { next: () => values[index++ % values.length] ?? 0 };
};

describe('binomial', () => {
  it('uses the exact Bernoulli-sum path for small n', () => {
    expect(binomialSample(sequence([0.1, 0.9, 0.4]), 3, 0.5)).toBe(2);
    expect(binomialSample(sequence([0.9, 0.9, 0.9]), 3, 0.5)).toBe(0);
    expect(binomialSample(sequence([0.1, 0.1, 0.1]), 3, 0.5)).toBe(3);
  });

  it('short-circuits degenerate probabilities without consuming the RNG', () => {
    const untouched: RandomSource = {
      next: () => {
        throw new Error('should not draw');
      },
    };
    expect(binomialSample(untouched, 7, 0)).toBe(0);
    expect(binomialSample(untouched, 7, 1)).toBe(7);
    expect(binomialSample(untouched, 0, 0.5)).toBe(0);
  });

  it('uses the normal approximation for large n and stays in range', () => {
    expect(NORMAL_APPROX_THRESHOLD).toBe(50);
    const distribution = createBinomial(200, 0.3);
    expect(distribution.mean).toBe(60);
    expect(distribution.variance).toBeCloseTo(42, 12);
    expect(distribution.support).toEqual([0, 200]);

    const values = sampleMany(distribution, seeded(), 20000);
    const average = values.reduce((sum, value) => sum + value, 0) / values.length;
    const variance = values.reduce((sum, value) => sum + (value - average) ** 2, 0) / values.length;
    expect(Math.abs(average - 60)).toBeLessThan(0.5);
    expect(Math.abs(variance - 42)).toBeLessThan(3);
    expect(values.every((value) => Number.isInteger(value) && value >= 0 && value <= 200)).toBe(true);
    expect(binomialSample(sequence([0, 0]), 1000, 0.5)).toBeGreaterThanOrEqual(0);
    expect(binomialSample(sequence([1, 1]), 1000, 0.5)).toBeLessThanOrEqual(1000);
  });

  it('exposes moments and validates parameters', () => {
    expect(binomialMoments(10, 0.25)).toEqual({ mean: 2.5, variance: 1.875 });
    expect(() => binomialSample(seeded(), 2.5, 0.5)).toThrow(RangeError);
    expect(() => binomialSample(seeded(), -1, 0.5)).toThrow(RangeError);
    expect(() => binomialSample(seeded(), 10, 1.2)).toThrow(RangeError);
    expect(() => binomialMoments(10, Number.NaN)).toThrow(RangeError);
  });
});
