import { describe, expect, it } from 'vitest';
import { SeededRandom } from '@/engine/random/rng';
import {
  DEFAULT_MAX_ATTEMPTS,
  truncatedSample,
  truncatedSampler,
  type BoundedSampler,
} from './truncated';
import type { RandomSource } from './sampler';

const seeded = (seed = 12345): SeededRandom => new SeededRandom(seed);
const sequence = (values: readonly number[]): RandomSource => {
  let index = 0;
  return { next: () => values[index++ % values.length] ?? 0 };
};

describe('truncated', () => {
  it('rejects out-of-bounds draws from a bounded sampler', () => {
    const bounded = truncatedSampler(
      () => -1 + sequence([0.2, 0.6, 0.8]).next() * 10,
      0,
      1,
    );
    // Explicit sequence keeps rejection and acceptance deterministic.
    let index = 0;
    const values = [-1, 0.25, 9, 0.75];
    const sampling: BoundedSampler = () => values[index++] ?? Number.NaN;
    expect(truncatedSample(seeded(), sampling, 0, 1, 4)).toBe(0.25);
    expect(truncatedSample(seeded(), sampling, 0, 1, 4)).toBe(0.75);
    expect(typeof bounded).toBe('function');
  });

  it('keeps seeded normal draws within bounds', () => {
    const wrapped = truncatedSampler((rng) => (rng.next() - 0.5) * 6, -1, 1);
    for (let i = 0; i < 500; i += 1) {
      const value = wrapped(seeded(i + 1));
      expect(value).toBeGreaterThanOrEqual(-1);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  it('stops after the guard limit and validates arguments', () => {
    let attempts = 0;
    const outside: BoundedSampler = () => {
      attempts += 1;
      return 99;
    };
    expect(() => truncatedSample(seeded(), outside, 0, 1, 3)).toThrow(/exceeded 3 attempts/);
    expect(attempts).toBe(3);

    expect(DEFAULT_MAX_ATTEMPTS).toBe(1000);
    expect(() => truncatedSample(seeded(), outside, 1, 1)).toThrow(RangeError);
    expect(() => truncatedSample(seeded(), outside, 2, 1)).toThrow(RangeError);
    expect(() => truncatedSample(seeded(), outside, Number.NaN, 1)).toThrow(RangeError);
    expect(() => truncatedSample(seeded(), outside, 0, 1, 0)).toThrow(RangeError);
    expect(() => truncatedSample(seeded(), outside, 0, 1, 1.5)).toThrow(RangeError);
  });
});
