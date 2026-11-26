import { describe, expect, it } from 'vitest';
import { computeMoments, OnlineMoments } from './moments';

describe('moments', () => {
  it('computes population mean, variance and zero skewness for symmetric data', () => {
    const moments = computeMoments([1, 2, 3, 4]);
    expect(moments.count).toBe(4);
    expect(moments.mean).toBe(2.5);
    expect(moments.variance).toBeCloseTo(1.25, 12);
    expect(moments.skewness).toBeCloseTo(0, 12);
  });

  it('detects positive skewness and matches incremental online updates', () => {
    const values = [1, 1, 1, 2];
    const tracker = new OnlineMoments();
    let latest = tracker.snapshot;
    for (const value of values) latest = tracker.push(value);
    expect(latest).toEqual(computeMoments(values));
    expect(latest.skewness).toBeGreaterThan(0);
  });

  it('stays stable for values with a large common offset', () => {
    const offset = 1e9;
    const moments = computeMoments([offset + 1, offset + 2, offset + 3]);
    expect(moments.mean).toBeCloseTo(offset + 2, 6);
    expect(moments.variance).toBeCloseTo(2 / 3, 9);
    expect(Math.abs(moments.skewness)).toBeLessThan(1e-6);
  });

  it('handles empty data, reset and non-finite input', () => {
    const tracker = new OnlineMoments();
    expect(tracker.snapshot).toEqual({ count: 0, mean: 0, variance: 0, skewness: 0 });
    tracker.push(5);
    tracker.reset();
    expect(tracker.snapshot.count).toBe(0);
    expect(() => tracker.push(Number.NaN)).toThrow(RangeError);
    expect(() => computeMoments([1, Number.POSITIVE_INFINITY])).toThrow(RangeError);
  });
});
