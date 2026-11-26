import { describe, expect, it } from 'vitest';
import { computeHistogram } from '@/ui/chartUtils/histogram';

describe('computeHistogram', () => {
  it('computes evenly spaced bins with known counts', () => {
    const bins = computeHistogram([0, 1, 2, 3, 4], { binCount: 5, min: 0, max: 5 });
    expect(bins).toEqual([
      { start: 0, end: 1, count: 1 },
      { start: 1, end: 2, count: 1 },
      { start: 2, end: 3, count: 1 },
      { start: 3, end: 4, count: 1 },
      { start: 4, end: 5, count: 1 },
    ]);
  });

  it('handles inclusive and exclusive upper edges', () => {
    const values = [0, 1, 2];
    expect(computeHistogram(values, { binCount: 2, min: 0, max: 2 }).map((bin) => bin.count))
      .toEqual([1, 2]);
    expect(computeHistogram(values, {
      binCount: 2,
      min: 0,
      max: 2,
      includeUpperEdge: false,
    }).map((bin) => bin.count)).toEqual([1, 1]);
  });

  it('skips invalid numbers outside the domain', () => {
    const bins = computeHistogram([Number.NaN, Number.POSITIVE_INFINITY, -2, 1, 2], {
      binCount: 2,
      min: 0,
      max: 2,
    });
    expect(bins.map((bin) => bin.count)).toEqual([0, 2]);
  });

  it('handles empty, single-point, and degenerate inputs', () => {
    expect(computeHistogram([])).toEqual([]);
    expect(computeHistogram([7])).toEqual([{ start: 7, end: 7, count: 1 }]);
    expect(computeHistogram([7], { includeUpperEdge: false }))
      .toEqual([{ start: 7, end: 7, count: 0 }]);
  });

  it('produces stable bin ordering for different value ordering', () => {
    const options = { binCount: 2, min: 0, max: 2 } as const;
    expect(computeHistogram([2, 1, 0], options)).toEqual(computeHistogram([0, 1, 2], options));
  });
});
