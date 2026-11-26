import { describe, expect, it } from 'vitest';
import { autocorrelation, autocorrelationReport } from './autocorrelation';

describe('autocorrelation', () => {
  it('reports strong positive association at lag 1 for a monotonic series', () => {
    const report = autocorrelationReport([0, 1, 2, 3, 4, 5], 1);
    expect(report.coefficient).toBeCloseTo(1, 10);
    expect(report.pairCount).toBe(5);
    expect(report.constant).toBe(false);
    expect(autocorrelation([0, 1, 2, 3, 4, 5], 1)).toBeCloseTo(1, 10);
  });

  it('is negative at lag 1 and positive at lag 2 for an alternating series', () => {
    const series = [1, 0, 1, 0, 1, 0];
    expect(autocorrelation(series, 1)).toBeCloseTo(-1, 10);
    expect(autocorrelation(series, 2)).toBeCloseTo(1, 10);
  });

  it('guards constant and too-short series with a zero coefficient', () => {
    expect(autocorrelationReport([4, 4, 4, 4], 1)).toEqual({
      lag: 1, coefficient: 0, pairCount: 0, constant: true,
    });
    expect(autocorrelation([1], 1)).toBe(0);
    expect(autocorrelation([], 1)).toBe(0);
  });

  it('handles lag zero, out-of-range lags, negative lags and non-finite values', () => {
    expect(autocorrelationReport([1, 2, 3], 0)).toEqual({
      lag: 0, coefficient: 1, pairCount: 3, constant: false,
    });
    expect(autocorrelation([1, 2, 3], 5)).toBe(0);
    expect(autocorrelation([1, 2, 3], -2)).toBeCloseTo(1, 10);
    expect(autocorrelation([1, Number.NaN, 2, 3], 1)).toBeCloseTo(1, 10);
  });
});
