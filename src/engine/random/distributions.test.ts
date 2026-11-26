import { describe, expect, it } from 'vitest';
import { bernoulli, exponential, normal, poisson, triangular, uniform, weightedPick } from './distributions';
import { SeededRandom } from './rng';

const rng = () => new SeededRandom(12345);

describe('probability distributions', () => {
  it('samples uniform values inside bounds', () => {
    const random = rng();
    for (let i = 0; i < 500; i += 1) {
      const value = uniform(random, -3, 7);
      expect(value).toBeGreaterThanOrEqual(-3);
      expect(value).toBeLessThanOrEqual(7);
    }
  });

  it('samples normally distributed values with expected moments', () => {
    const random = rng();
    const samples = Array.from({ length: 20000 }, () => normal(random, 10, 2));
    const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
    const variance = samples.reduce((a, b) => a + (b - avg) ** 2, 0) / samples.length;
    expect(avg).toBeCloseTo(10, 1);
    expect(Math.sqrt(variance)).toBeCloseTo(2, 1);
    expect(normal(random, 5, 0)).toBe(5);
  });

  it('honours Bernoulli probability boundaries', () => {
    const random = rng();
    expect(bernoulli(random, 0)).toBe(false);
    expect(bernoulli(random, 1)).toBe(true);
    const samples = Array.from({ length: 10000 }, () => bernoulli(random, 0.3));
    expect(Math.abs(samples.filter(Boolean).length / samples.length - 0.3)).toBeLessThan(0.03);
  });

  it('selects weighted outcomes proportionally', () => {
    const random = rng();
    const picks = Array.from({ length: 10000 }, () => weightedPick(random, [
      { value: 'a', weight: 8 },
      { value: 'b', weight: 2 },
    ]));
    expect(picks.filter((p) => p === 'a').length / picks.length).toBeCloseTo(0.8, 1);
    expect(weightedPick(random, [])).toBeUndefined();
  });

  it('samples exponential, triangular and poisson values', () => {
    const random = rng();
    expect(exponential(random, 2)).toBeGreaterThanOrEqual(0);
    expect(exponential(random, 0)).toBe(Number.POSITIVE_INFINITY);
    for (let i = 0; i < 100; i += 1) {
      expect(triangular(random, 0, 10, 3)).toBeGreaterThanOrEqual(0);
      expect(triangular(random, 0, 10, 3)).toBeLessThanOrEqual(10);
    }
    const counts = Array.from({ length: 5000 }, () => poisson(random, 4));
    const avg = counts.reduce((a, b) => a + b, 0) / counts.length;
    expect(avg).toBeCloseTo(4, 0);
  });
});
