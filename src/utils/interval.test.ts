import { describe, expect, it } from 'vitest';
import { add, contains, intersect, interval, multiply, subtract, width } from './interval';

describe('finite intervals', () => {
  it('validates bounds', () => {
    expect(interval(2, 5)).toEqual({ min: 2, max: 5 });
    expect(() => interval(Number.NaN, 1)).toThrow('Minimum must be a finite number');
    expect(() => interval(1, Number.POSITIVE_INFINITY)).toThrow('Maximum must be a finite number');
    expect(() => interval(5, 2)).toThrow('Interval minimum cannot exceed maximum');
  });

  it('adds and subtracts ranges', () => {
    const a = interval(1, 3);
    const b = interval(10, 20);
    expect(add(a, b)).toEqual({ min: 11, max: 23 });
    expect(subtract(a, b)).toEqual({ min: -19, max: -7 });
  });

  it('multiplies across sign boundaries', () => {
    expect(multiply(interval(-2, 3), interval(4, 5))).toEqual({ min: -10, max: 15 });
    expect(multiply(interval(-3, -1), interval(-2, 4))).toEqual({ min: -12, max: 6 });
  });

  it('intersects, contains and measures', () => {
    expect(intersect(interval(1, 5), interval(3, 9))).toEqual({ min: 3, max: 5 });
    expect(intersect(interval(1, 2), interval(3, 4))).toBeNull();
    expect(contains(interval(1, 5), 1)).toBe(true);
    expect(contains(interval(1, 5), 5)).toBe(true);
    expect(contains(interval(1, 5), 6)).toBe(false);
    expect(width(interval(-2, 5))).toBe(7);
  });
});
