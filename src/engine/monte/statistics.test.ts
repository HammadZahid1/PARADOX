import { describe, expect, it } from 'vitest';
import type { DistributionStatistics } from '@/engine/types';
import { computeDistributionStatistics } from './statistics';

function allNumbers(stats: DistributionStatistics): number[] {
  const { histogram, ...scalars } = stats;
  return [
    ...Object.values(scalars),
    ...histogram.flatMap((bin) => [bin.binStart, bin.binEnd, bin.count]),
  ];
}

describe('computeDistributionStatistics', () => {
  it('produces known sample statistics and a 12-bin histogram', () => {
    const stats = computeDistributionStatistics([1, 2, 3, 4, 5]);
    expect(stats.count).toBe(5);
    expect(stats.mean).toBe(3);
    expect(stats.median).toBe(3);
    expect(stats.stdDev).toBeCloseTo(Math.sqrt(2.5), 10);
    expect(stats.min).toBe(1);
    expect(stats.max).toBe(5);
    expect(stats.p05).toBeCloseTo(1.2, 10);
    expect(stats.p25).toBe(2);
    expect(stats.p75).toBe(4);
    expect(stats.p95).toBeCloseTo(4.8, 10);
    expect(stats.ci95Low).toBeCloseTo(3 - 1.96 * Math.sqrt(2.5) / Math.sqrt(5), 10);
    expect(stats.ci95High).toBeCloseTo(3 + 1.96 * Math.sqrt(2.5) / Math.sqrt(5), 10);
    expect(stats.histogram).toHaveLength(12);
    expect(stats.histogram.reduce((sum, bin) => sum + bin.count, 0)).toBe(5);
    expect(stats.histogram[11]?.count).toBe(1);
  });

  it('uses linear interpolation for quantile edges', () => {
    const stats = computeDistributionStatistics([0, 10]);
    expect(stats.p05).toBeCloseTo(0.5, 10);
    expect(stats.p95).toBeCloseTo(9.5, 10);
    expect(stats.stdDev).toBeCloseTo(Math.sqrt(50), 10);
  });

  it('returns finite neutral values for empty inputs', () => {
    const stats = computeDistributionStatistics([]);
    expect(stats.count).toBe(0);
    expect(stats.mean).toBe(0);
    expect(stats.median).toBe(0);
    expect(stats.stdDev).toBe(0);
    expect(stats.ci95Low).toBe(0);
    expect(stats.ci95High).toBe(0);
    expect(stats.histogram).toHaveLength(12);
    expect(allNumbers(stats).every(Number.isFinite)).toBe(true);
  });

  it('handles single-value and constant arrays without NaN', () => {
    for (const values of [[7], [7, 7, 7]]) {
      const stats = computeDistributionStatistics(values);
      expect(stats.count).toBe(values.length);
      expect(stats.mean).toBe(7);
      expect(stats.min).toBe(7);
      expect(stats.max).toBe(7);
      expect(stats.stdDev).toBe(0);
      expect(stats.ci95Low).toBe(7);
      expect(stats.ci95High).toBe(7);
      expect(stats.histogram.reduce((sum, bin) => sum + bin.count, 0)).toBe(values.length);
      expect(allNumbers(stats).every(Number.isFinite)).toBe(true);
    }
  });

  it('ignores non-finite inputs', () => {
    const stats = computeDistributionStatistics([1, Number.NaN, Number.POSITIVE_INFINITY, 3]);
    expect(stats.count).toBe(2);
    expect(stats.mean).toBe(2);
    expect(stats.median).toBe(2);
    expect(allNumbers(stats).every(Number.isFinite)).toBe(true);
  });
});
