import { describe, expect, it } from 'vitest';
import { SeededRandom } from '@/engine/random/rng';
import {
  requireFinite,
  requireInteger,
  requireNonNegative,
  requirePositive,
  sampleInto,
  sampleMany,
  standardNormal,
  unitInterval,
  type Distribution,
  type RandomSource,
} from './sampler';

const seeded = (seed = 12345): SeededRandom => new SeededRandom(seed);
const sequence = (values: readonly number[]): RandomSource => {
  let index = 0;
  return { next: () => values[index++ % values.length] ?? 0 };
};
const constant = (value: number): Distribution => ({
  mean: value,
  variance: 0,
  support: [value, value],
  sample: () => value,
});

describe('sampler helpers', () => {
  it('accepts SeededRandom and minimal RNGs through the shared interface', () => {
    const distribution = constant(7);
    expect(sampleMany(distribution, seeded(), 3)).toEqual([7, 7, 7]);
    expect(sampleMany(distribution, sequence([]), 2)).toEqual([7, 7]);
    const target = [0, 0, 0];
    expect(sampleInto(distribution, seeded(), target)).toBe(target);
    expect(target).toEqual([7, 7, 7]);
  });

  it('returns empty arrays for non-positive or non-finite counts', () => {
    const distribution = constant(1);
    expect(sampleMany(distribution, seeded(), 0)).toEqual([]);
    expect(sampleMany(distribution, seeded(), -2)).toEqual([]);
    expect(sampleMany(distribution, seeded(), Number.NaN)).toEqual([]);
    expect(sampleMany(distribution, seeded(), Number.POSITIVE_INFINITY)).toEqual([]);
  });

  it('clamps unit draws and derives reproducible standard normals', () => {
    expect(unitInterval(sequence([0, 1, 0.5, -1, 2, Number.NaN]))).toBeCloseTo(Number.EPSILON, 20);
    expect(unitInterval(sequence([1]))).toBeCloseTo(1 - Number.EPSILON, 20);
    expect(unitInterval(sequence([0.5]))).toBe(0.5);
    expect(standardNormal(seeded(11))).toBe(standardNormal(seeded(11)));
  });

  it('validates numeric arguments', () => {
    expect(() => requireFinite(1, 'value')).not.toThrow();
    expect(() => requireFinite(Number.NaN, 'value')).toThrow(RangeError);
    expect(() => requirePositive(0, 'value')).toThrow(RangeError);
    expect(() => requireNonNegative(-1, 'value')).toThrow(RangeError);
    expect(() => requireInteger(1.5, 'value')).toThrow(RangeError);
  });
});
