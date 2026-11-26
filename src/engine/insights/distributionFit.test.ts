import { describe, expect, it } from 'vitest';
import { compareDistributionFits, fitDistribution, sampleMoments } from './distributionFit';

describe('sampleMoments', () => {
  it('computes population mean, variance, bounds and skew', () => {
    const moments = sampleMoments([1, 2, 3, 4, 5]);
    expect(moments.count).toBe(5);
    expect(moments.mean).toBe(3);
    expect(moments.variance).toBeCloseTo(2, 10);
    expect(moments.stdDev).toBeCloseTo(Math.sqrt(2), 10);
    expect(moments.skew).toBeCloseTo(0, 10);
    expect(moments.min).toBe(1);
    expect(moments.max).toBe(5);
    expect(sampleMoments([0, 0, 0, 0, 10]).skew).toBeCloseTo(1.5, 10);
  });

  it('returns neutral moments for empty or non-finite samples', () => {
    expect(sampleMoments([Number.NaN, Infinity])).toEqual({
      count: 0, mean: 0, variance: 0, stdDev: 0, skew: 0, min: 0, max: 0,
    });
  });
});

describe('fitDistribution', () => {
  it('matches normal reference moments exactly for a symmetric sample', () => {
    const fit = fitDistribution([1, 2, 3, 4, 5], 'normal');
    expect(fit.kind).toBe('normal');
    expect(fit.reference.mean).toBe(3);
    expect(fit.reference.variance).toBeCloseTo(2, 10);
    expect(fit.reference.skew).toBe(0);
    expect(fit.meanDeviation).toBe(0);
    expect(fit.varianceDeviation).toBe(0);
    expect(fit.skewDeviation).toBe(0);
    expect(fit.score).toBe(0);
    expect(fit.note).toBe('descriptive-only');
  });

  it('uses the observed range for uniform reference moments', () => {
    const fit = fitDistribution([0, 2, 4, 6], 'uniform');
    expect(fit.reference.mean).toBe(3);
    expect(fit.reference.variance).toBeCloseTo(3, 10);
    expect(fit.reference.stdDev).toBeCloseTo(Math.sqrt(3), 10);
    expect(fit.observed.variance).toBeCloseTo(5, 10);
    expect(fit.varianceDeviation).toBeCloseTo(2 / 3, 10);
    expect(fit.score).toBeCloseTo(2 / 9, 10);
  });

  it('flags skew deviations without claiming statistical significance', () => {
    const fit = fitDistribution([0, 0, 0, 0, 10], 'normal');
    expect(fit.observed.skew).toBeGreaterThan(1);
    expect(fit.skewDeviation).toBeGreaterThan(1);
    expect(fit.score).toBeGreaterThan(0);
    expect(fit.note).toBe('descriptive-only');
  });
});

describe('compareDistributionFits', () => {
  it('returns both reference fits ordered by descriptive score', () => {
    const fits = compareDistributionFits([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(fits.map((fit) => fit.kind)).toEqual(['normal', 'uniform']);
    expect(fits.every((fit) => Number.isFinite(fit.score) && fit.score >= 0)).toBe(true);
    expect(fits[0]?.score).toBeLessThanOrEqual(fits[1]?.score ?? 0);
  });
});
