import { describe, expect, it } from 'vitest';
import { SeededRandom } from '@/engine/random/rng';
import { createGamma, gammaMoments, gammaSample } from './gamma';
import { sampleMany } from './sampler';

const seeded = (seed = 12345): SeededRandom => new SeededRandom(seed);

describe('gamma', () => {
  it('reports shape/scale moments', () => {
    expect(gammaMoments(2, 3)).toEqual({ mean: 6, variance: 18 });
  });

  it('samples shape >= 1 with the expected mean and variance', () => {
    const distribution = createGamma(2, 3);
    expect(distribution.support).toEqual([0, Number.POSITIVE_INFINITY]);
    const values = sampleMany(distribution, seeded(), 20000);
    const average = values.reduce((sum, value) => sum + value, 0) / values.length;
    const variance = values.reduce((sum, value) => sum + (value - average) ** 2, 0) / values.length;
    expect(average).toBeCloseTo(6, 1);
    expect(Math.abs(variance - 18)).toBeLessThan(1);
    expect(values.every((value) => value > 0 && Number.isFinite(value))).toBe(true);
  });

  it('samples shape < 1 through the boost path and is reproducible', () => {
    const values = sampleMany(createGamma(0.5, 1), seeded(4242), 20000);
    const average = values.reduce((sum, value) => sum + value, 0) / values.length;
    expect(average).toBeCloseTo(0.5, 1);
    expect(values.every((value) => value > 0 && Number.isFinite(value))).toBe(true);
    expect(sampleMany(createGamma(1.5, 2), seeded(99), 64)).toEqual(
      sampleMany(createGamma(1.5, 2), seeded(99), 64),
    );
  });

  it('validates shape and scale', () => {
    expect(() => gammaSample(seeded(), 0, 1)).toThrow(RangeError);
    expect(() => gammaSample(seeded(), -1, 1)).toThrow(RangeError);
    expect(() => gammaSample(seeded(), 1, 0)).toThrow(RangeError);
    expect(() => gammaSample(seeded(), 1, Number.POSITIVE_INFINITY)).toThrow(RangeError);
    expect(() => gammaMoments(1, Number.NaN)).toThrow(RangeError);
  });
});
