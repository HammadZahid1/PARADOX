import { describe, expect, it } from 'vitest';
import { summarizeSeries } from './descriptive';

describe('summarizeSeries', () => {
  it('computes known population statistics with interpolated percentiles', () => {
    const summary = summarizeSeries([1, 2, 3, 4, 5]);
    expect(summary).toEqual({
      count: 5,
      min: 1,
      max: 5,
      mean: 3,
      median: 3,
      variance: 2,
      stdDev: Math.sqrt(2),
      p05: 1.2,
      p95: 4.8,
    });
  });

  it('interpolates over an even number of samples', () => {
    const summary = summarizeSeries([0, 10]);
    expect(summary.count).toBe(2);
    expect(summary.median).toBe(5);
    expect(summary.p05).toBeCloseTo(0.5, 10);
    expect(summary.p95).toBeCloseTo(9.5, 10);
    expect(summary.variance).toBe(25);
  });

  it('returns an all-zero summary for empty or entirely invalid series', () => {
    const neutral = { count: 0, min: 0, max: 0, mean: 0, median: 0, variance: 0, stdDev: 0, p05: 0, p95: 0 };
    expect(summarizeSeries([])).toEqual(neutral);
    expect(summarizeSeries([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])).toEqual(neutral);
  });

  it('handles single-element and constant series', () => {
    expect(summarizeSeries([7])).toEqual({
      count: 1, min: 7, max: 7, mean: 7, median: 7, variance: 0, stdDev: 0, p05: 7, p95: 7,
    });
    const constant = summarizeSeries([7, 7, 7]);
    expect(constant.count).toBe(3);
    expect(constant.mean).toBe(7);
    expect(constant.median).toBe(7);
    expect(constant.variance).toBe(0);
    expect(constant.stdDev).toBe(0);
    expect(Object.values(constant).every(Number.isFinite)).toBe(true);
  });

  it('ignores non-finite inputs without mutating the source', () => {
    const input = [1, Number.NaN, Number.POSITIVE_INFINITY, 3];
    const summary = summarizeSeries(input);
    expect(input).toEqual([1, Number.NaN, Number.POSITIVE_INFINITY, 3]);
    expect(summary.count).toBe(2);
    expect(summary.mean).toBe(2);
    expect(summary.median).toBe(2);
    expect(summary.variance).toBe(1);
    expect(summary.stdDev).toBe(1);
    expect(summary.p05).toBeCloseTo(1.1, 10);
    expect(summary.p95).toBeCloseTo(2.9, 10);
  });
});
