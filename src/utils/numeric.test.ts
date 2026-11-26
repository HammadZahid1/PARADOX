import { describe, expect, it } from 'vitest';
import { approximatelyEqual, areFiniteNumbers, inverseLerp, isFiniteNumber, lerp, requireFinite, roundTo } from './numeric';

describe('numeric helpers', () => {
  it('guards finite numbers', () => {
    expect(isFiniteNumber(0)).toBe(true);
    expect(isFiniteNumber(Number.NaN)).toBe(false);
    expect(isFiniteNumber('1')).toBe(false);
    expect(areFiniteNumbers([1, 2, 3])).toBe(true);
    expect(areFiniteNumbers([1, Number.POSITIVE_INFINITY])).toBe(false);
    expect(requireFinite(2, 'score')).toBe(2);
    expect(() => requireFinite(Number.NaN, 'score')).toThrow('score must be a finite number');
  });

  it('rounds to a fixed number of decimals', () => {
    expect(roundTo(0.1 + 0.2, 2)).toBe(0.3);
    expect(roundTo(12.3456, 3)).toBe(12.346);
    expect(roundTo(12.3456, 0)).toBe(12);
    expect(roundTo(Number.NaN)).toBeNaN();
  });

  it('interpolates and inverts', () => {
    expect(lerp(0, 10, 0.25)).toBe(2.5);
    expect(lerp(0, 10, 2)).toBe(20);
    expect(inverseLerp(0, 10, 2.5)).toBe(0.25);
    expect(inverseLerp(5, 5, 5)).toBeNaN();
    expect(lerp(0, 1, Number.NaN)).toBeNaN();
    expect(inverseLerp(0, 1, Number.POSITIVE_INFINITY)).toBeNaN();
  });

  it('compares approximately with a tolerance', () => {
    expect(approximatelyEqual(0.1 + 0.2, 0.3)).toBe(true);
    expect(approximatelyEqual(1, 1.5, 0.1)).toBe(false);
    expect(approximatelyEqual(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY)).toBe(true);
    expect(approximatelyEqual(Number.NaN, Number.NaN)).toBe(false);
    expect(approximatelyEqual(1, 1.5, Number.NaN)).toBe(false);
  });
});
