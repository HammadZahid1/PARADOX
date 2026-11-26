import { describe, expect, it } from 'vitest';
import { SeededRandom } from '@/engine/random/rng';
import { betaMoments, betaSample, createBeta } from './beta';
import { sampleMany } from './sampler';

const seeded = (seed = 12345): SeededRandom => new SeededRandom(seed);

describe('beta', () => {
  it('reports alpha/beta moments', () => {
    const moments = betaMoments(2, 3);
    expect(moments.mean).toBeCloseTo(0.4, 12);
    expect(moments.variance).toBeCloseTo(0.04, 12);
  });

  it('draws from two gamma variables with matching moments', () => {
    const distribution = createBeta(2, 3);
    expect(distribution.support).toEqual([0, 1]);
    const values = sampleMany(distribution, seeded(), 20000);
    const average = values.reduce((sum, value) => sum + value, 0) / values.length;
    const variance = values.reduce((sum, value) => sum + (value - average) ** 2, 0) / values.length;
    expect(average).toBeCloseTo(0.4, 2);
    expect(Math.abs(variance - 0.04)).toBeLessThan(0.005);
    expect(values.every((value) => value >= 0 && value <= 1)).toBe(true);
  });

  it('is reproducible for a fixed seed', () => {
    expect(sampleMany(createBeta(1, 1), seeded(2024), 48)).toEqual(
      sampleMany(createBeta(1, 1), seeded(2024), 48),
    );
  });

  it('validates shape parameters', () => {
    expect(() => betaSample(seeded(), 0, 1)).toThrow(RangeError);
    expect(() => betaSample(seeded(), 1, -2)).toThrow(RangeError);
    expect(() => betaMoments(Number.NaN, 1)).toThrow(RangeError);
    expect(() => betaMoments(1, Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });
});
