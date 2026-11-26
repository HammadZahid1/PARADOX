import { describe, expect, it } from 'vitest';
import { classifyTrend } from './trend';

describe('classifyTrend', () => {
  it('detects linear trends with known slopes', () => {
    expect(classifyTrend([1, 2, 3, 4])).toEqual({ trend: 'increasing', slope: 1, signChanges: 0 });
    expect(classifyTrend([4, 3, 2, 1])).toEqual({ trend: 'decreasing', slope: -1, signChanges: 0 });
    expect(classifyTrend([1, 3, 5], { threshold: 0.5 })).toEqual({ trend: 'increasing', slope: 2, signChanges: 0 });
  });

  it('classifies flat and cyclic series from slope and sign changes', () => {
    expect(classifyTrend([5, 5, 5])).toEqual({ trend: 'flat', slope: 0, signChanges: 0 });
    expect(classifyTrend([0, 1, 0, 1, 0])).toEqual({ trend: 'cyclic', slope: 0, signChanges: 3 });
    expect(classifyTrend([0, 1, 0, 1, 0], { minSignChanges: 5 })).toMatchObject({ trend: 'flat' });
  });

  it('applies configurable slope and noise thresholds', () => {
    const gentle = [0, 0.005, 0.01, 0.015];
    expect(classifyTrend(gentle).trend).toBe('flat');
    expect(classifyTrend(gentle, { threshold: 0.001 }).trend).toBe('increasing');
    const wobbly = [1, 1.01, 1, 1.01];
    expect(classifyTrend(wobbly).trend).toBe('cyclic');
    expect(classifyTrend(wobbly, { noiseThreshold: 0.02 })).toMatchObject({ trend: 'flat', signChanges: 0 });
  });

  it('handles empty, single-element, constant and non-finite inputs', () => {
    expect(classifyTrend([])).toEqual({ trend: 'flat', slope: 0, signChanges: 0 });
    expect(classifyTrend([7])).toEqual({ trend: 'flat', slope: 0, signChanges: 0 });
    expect(classifyTrend([7, 7, 7]).trend).toBe('flat');
    expect(classifyTrend([1, Number.NaN, 2, Number.POSITIVE_INFINITY, 3])).toEqual({
      trend: 'increasing', slope: 1, signChanges: 0,
    });
    expect(classifyTrend([1, 2, 3], { threshold: Number.NaN }).trend).toBe('increasing');
  });
});
