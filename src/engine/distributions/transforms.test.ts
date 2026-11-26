import { describe, expect, it } from 'vitest';
import { SeededRandom } from '@/engine/random/rng';
import { createEmpirical } from './empirical';
import type { Distribution } from './sampler';
import { abs, applyTransform, clamp, composeTransforms, scale, shift } from './transforms';

const seeded = (seed = 12345): SeededRandom => new SeededRandom(seed);
const constant = (value: number): Distribution => ({
  mean: value,
  variance: 0,
  support: [value, value],
  sample: () => value,
});

describe('transforms', () => {
  it('scales and shifts samples, moments and support', () => {
    const scaled = scale(constant(2), -3);
    expect(scaled.sample(seeded())).toBe(-6);
    expect(scaled.mean).toBe(-6);
    expect(scaled.variance).toBe(0);
    expect(scaled.support).toEqual([-6, -6]);

    const shifted = shift(scaled, 10);
    expect(shifted.sample(seeded())).toBe(4);
    expect(shifted.mean).toBe(4);
    expect(shifted.variance).toBe(0);
    expect(shifted.support).toEqual([4, 4]);
  });

  it('composes transforms left to right and honours explicit moments', () => {
    const transform = composeTransforms((value) => value * 2, (value) => value + 1);
    expect(transform(3)).toBe(7);
    expect(composeTransforms()(3)).toBe(3);

    const wrapped = applyTransform(constant(4), transform, {
      mean: 9,
      variance: 0,
      support: [9, 9],
    });
    expect(wrapped.sample(seeded())).toBe(9);
    expect(wrapped.mean).toBe(9);
    expect(wrapped.support).toEqual([9, 9]);
  });

  it('clamps samples and absolute values within derived support', () => {
    const clamped = clamp(createEmpirical([0, 5, 10]), 2, 8);
    const values = Array.from({ length: 200 }, () => clamped.sample(seeded()));
    expect(values.every((value) => value >= 2 && value <= 8)).toBe(true);
    expect(clamped.support).toEqual([2, 8]);
    expect(clamped.variance).toBeLessThanOrEqual(9);

    const absolute = abs(constant(-3));
    expect(absolute.sample(seeded())).toBe(3);
    expect(absolute.mean).toBe(3);
    expect(absolute.variance).toBe(0);
    expect(absolute.support).toEqual([0, 3]);
  });

  it('validates transform arguments', () => {
    expect(() => scale(constant(1), Number.NaN)).toThrow(RangeError);
    expect(() => shift(constant(1), Number.POSITIVE_INFINITY)).toThrow(RangeError);
    expect(() => clamp(constant(1), 5, 4)).toThrow(RangeError);
    expect(() => applyTransform(constant(1), (value) => value, { variance: -1 })).toThrow(RangeError);
  });
});
