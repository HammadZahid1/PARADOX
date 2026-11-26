import { describe, expect, it } from 'vitest';
import { SeededRandom } from '@/engine/random/rng';
import { createMixture, mixtureMoments, mixtureSample, normalizedWeights, type MixtureComponent } from './mixture';
import { sampleMany, type RandomSource } from './sampler';

const seeded = (seed = 12345): SeededRandom => new SeededRandom(seed);
const sequence = (values: readonly number[]): RandomSource => {
  let index = 0;
  return { next: () => values[index++ % values.length] ?? 0 };
};
const constant = (value: number, weight: number): MixtureComponent => ({
  weight,
  mean: value,
  variance: 0,
  support: [value, value],
  sample: () => value,
});

describe('mixture', () => {
  it('normalizes positive weights and ignores invalid ones', () => {
    const components = [constant(0, 3), constant(10, 1), constant(99, -2), constant(100, 0)];
    expect(normalizedWeights(components)).toEqual([0.75, 0.25]);
    expect(normalizedWeights([constant(0, Number.NaN)])).toEqual([]);
  });

  it('selects components deterministically by weight', () => {
    const components = [constant(0, 3), constant(10, 1)];
    const rng = sequence([0.2, 0.8]);
    expect(mixtureSample(rng, components)).toBe(0);
    expect(mixtureSample(rng, components)).toBe(10);
  });

  it('approaches the weighted mean with a seeded stream', () => {
    const distribution = createMixture([constant(0, 3), constant(10, 1)]);
    const values = sampleMany(distribution, seeded(), 20000);
    const average = values.reduce((sum, value) => sum + value, 0) / values.length;
    expect(average).toBeCloseTo(2.5, 1);
    expect(values.every((value) => value === 0 || value === 10)).toBe(true);
    expect(distribution.support).toEqual([0, 10]);
  });

  it('computes total variance and rejects empty weight sets', () => {
    const moments = mixtureMoments([constant(0, 3), constant(10, 1)]);
    expect(moments.mean).toBeCloseTo(2.5, 12);
    expect(moments.variance).toBeCloseTo(18.75, 12);

    expect(() => mixtureSample(seeded(), [constant(0, 0), constant(1, -1)])).toThrow(RangeError);
    expect(() => createMixture([])).toThrow(RangeError);
  });
});
