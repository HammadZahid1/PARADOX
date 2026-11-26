import { describe, expect, it } from 'vitest';
import { detectOutliers } from './outliers';

describe('detectOutliers', () => {
  it('finds outliers with the analytic MAD modified z-score', () => {
    const outliers = detectOutliers([1, 2, 3, 4, 5, 100]);
    expect(outliers.map((outlier) => outlier.index)).toEqual([5]);
    expect(outliers[0]?.value).toBe(100);
    expect(outliers[0]?.score).toBeCloseTo((0.6745 * (100 - 3.5)) / 1.5, 10);
  });

  it('honours the threshold and reports low-side outliers too', () => {
    expect(detectOutliers([1, 2, 3, 4, 5, 100], 50)).toEqual([]);
    const outliers = detectOutliers([1, 2, 3, 4, 5, 100], 1);
    expect(outliers.map((outlier) => outlier.index)).toEqual([0, 5]);
    expect(outliers[0]?.score).toBeCloseTo((0.6745 * (1 - 3.5)) / 1.5, 10);
    expect(outliers[1]?.score).toBeGreaterThan(0);
  });

  it('returns indices in ascending order and keeps original positions', () => {
    const outliers = detectOutliers([1, 2, 3, 4, 5, Number.NaN, 100]);
    expect(outliers.map((outlier) => outlier.index)).toEqual([6]);
    expect(outliers.map((outlier) => outlier.value)).toEqual([100]);
  });

  it('handles empty, single-element and constant series', () => {
    expect(detectOutliers([])).toEqual([]);
    expect(detectOutliers([9])).toEqual([]);
    expect(detectOutliers([7, 7, 7])).toEqual([]);
    expect(detectOutliers([7, 7, 7, 7, 7])).toEqual([]);
  });

  it('falls back to the default cutoff for an invalid threshold', () => {
    expect(detectOutliers([1, 2, 3, 4, 5, 100], Number.NaN).map((item) => item.index)).toEqual([5]);
    expect(detectOutliers([1, 2, 3, 4, 5, 100], -1).map((item) => item.index)).toEqual([5]);
  });
});
