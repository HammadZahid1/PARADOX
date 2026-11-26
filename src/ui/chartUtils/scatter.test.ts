import { describe, expect, it } from 'vitest';
import {
  computeCorrelation,
  computeCovariance,
  computeRegression,
} from '@/ui/chartUtils/scatter';

const increasing = [
  { x: 1, y: 2 },
  { x: 2, y: 4 },
  { x: 3, y: 6 },
];

describe('scatter statistics', () => {
  it('computes covariance, correlation, and regression for known points', () => {
    expect(computeCovariance(increasing)).toBeCloseTo(4 / 3);
    expect(computeCovariance(increasing, 'sample')).toBeCloseTo(2);
    expect(computeCorrelation(increasing)).toBeCloseTo(1);

    const regression = computeRegression(increasing);
    expect(regression.slope).toBeCloseTo(2);
    expect(regression.intercept).toBeCloseTo(0);
    expect(regression.rSquared).toBeCloseTo(1);
  });

  it('detects negative correlation', () => {
    const points = [{ x: 1, y: 3 }, { x: 2, y: 2 }, { x: 3, y: 1 }];
    expect(computeCorrelation(points)).toBeCloseTo(-1);
    expect(computeRegression(points).slope).toBeCloseTo(-1);
    expect(computeRegression(points).intercept).toBeCloseTo(4);
  });

  it('handles empty, single-point, and zero-variance inputs', () => {
    expect(computeCovariance([])).toBe(0);
    expect(computeCorrelation([{ x: 1, y: 2 }])).toBe(0);
    expect(computeRegression([{ x: 1, y: 2 }])).toEqual({
      slope: 0,
      intercept: 2,
      rSquared: 0,
    });

    const constantX = [{ x: 1, y: 2 }, { x: 1, y: 4 }];
    expect(computeCorrelation(constantX)).toBe(0);
    expect(computeRegression(constantX)).toEqual({
      slope: 0,
      intercept: 3,
      rSquared: 0,
    });
  });

  it('ignores invalid pairs', () => {
    const withInvalid = [
      { x: Number.NaN, y: 2 },
      ...increasing,
      { x: 4, y: Number.POSITIVE_INFINITY },
    ];
    expect(computeCovariance(withInvalid)).toBeCloseTo(computeCovariance(increasing));
    expect(computeCorrelation(withInvalid)).toBeCloseTo(1);
  });

  it('is stable when point order is reversed', () => {
    const reversed = [...increasing].reverse();
    expect(computeRegression(reversed)).toEqual(computeRegression(increasing));
    expect(computeCorrelation(reversed)).toBeCloseTo(computeCorrelation(increasing));
  });
});
