import { describe, expect, it } from 'vitest';
import { clamp, lerp, mean, quantile, relativeDifference, roundTo, safeDivide, standardDeviation } from './math';

describe('numeric helpers', () => {
  it('clamps and interpolates', () => {
    expect(clamp(12, 0, 10)).toBe(10);
    expect(clamp(-3, 0, 10)).toBe(0);
    expect(lerp(0, 100, 0.25)).toBe(25);
    expect(lerp(0, 100, 2)).toBe(100);
  });

  it('handles divide by zero and relative differences', () => {
    expect(safeDivide(5, 0, -1)).toBe(-1);
    expect(relativeDifference(10, 15)).toBeCloseTo(0.5);
    expect(relativeDifference(0, 5)).toBeNull();
    expect(relativeDifference(0, 0)).toBe(0);
  });

  it('computes descriptive statistics', () => {
    const values = [2, 4, 4, 4, 5, 5, 7, 9];
    expect(mean(values)).toBe(5);
    expect(standardDeviation(values)).toBeCloseTo(2);
    expect(quantile(values, 0.5)).toBe(4.5);
    expect(roundTo(0.1 + 0.2, 2)).toBe(0.3);
  });
});
