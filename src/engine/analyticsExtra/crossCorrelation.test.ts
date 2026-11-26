import { describe, expect, it } from 'vitest';
import { crossCorrelation } from './crossCorrelation';

describe('crossCorrelation', () => {
  it('finds the analytic correlation of shifted pulses at each lag', () => {
    const pairs = crossCorrelation([1, 0, 0], [0, 1, 0], 1);
    expect(pairs.map((pair) => pair.lag)).toEqual([-1, 0, 1]);
    expect(pairs[0]?.value).toBe(0);
    expect(pairs[1]?.value).toBeCloseTo(-0.5, 10);
    expect(pairs[2]?.value).toBeCloseTo(1, 10);
  });

  it('returns lag/value pairs in ascending lag order and clamps the limit', () => {
    const pairs = crossCorrelation([1, 0, 0], [0, 1, 0], 10);
    expect(pairs.map((pair) => pair.lag)).toEqual([-2, -1, 0, 1, 2]);
    expect(pairs.map((pair) => pair.value).every(Number.isFinite)).toBe(true);
    expect(crossCorrelation([1, 2], [2, 1], -3)).toEqual([{ lag: 0, value: -1 }]);
    expect(crossCorrelation([1, 2], [2, 1], Number.NaN)).toEqual([{ lag: 0, value: -1 }]);
  });

  it('returns zero for constant or single-element series', () => {
    expect(crossCorrelation([5, 5, 5], [1, 2, 3], 2).map((pair) => pair.value)).toEqual([0, 0, 0, 0, 0]);
    expect(crossCorrelation([7], [7], 5)).toEqual([{ lag: 0, value: 0 }]);
  });

  it('returns no pairs for empty series and ignores non-finite samples', () => {
    expect(crossCorrelation([], [1], 2)).toEqual([]);
    expect(crossCorrelation([1], [], 2)).toEqual([]);
    const pairs = crossCorrelation([1, Number.NaN, 0, Number.POSITIVE_INFINITY], [0, 1, 0], 1);
    expect(pairs.map((pair) => pair.lag)).toEqual([-1, 0, 1]);
    expect(pairs[1]?.value).toBeCloseTo(-1, 10);
    expect(pairs[2]?.value).toBeCloseTo(1, 10);
  });
});
