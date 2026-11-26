import { describe, expect, it } from 'vitest';
import { exponentialMovingAverage, simpleMovingAverage } from './movingAverage';

describe('simpleMovingAverage', () => {
  it('returns prefix-aware averages for a known series', () => {
    expect(simpleMovingAverage([1, 2, 3, 4, 5], 3)).toEqual([1, 1.5, 2, 3, 4]);
    expect(simpleMovingAverage([1, 2, 3, 4, 5], 2)).toEqual([1, 1.5, 2.5, 3.5, 4.5]);
    expect(simpleMovingAverage([1, 2, 3, 4, 5], 1)).toEqual([1, 2, 3, 4, 5]);
  });

  it('clamps oversized, fractional and invalid windows', () => {
    expect(simpleMovingAverage([1, 2, 3], 10)).toEqual([1, 1.5, 2]);
    expect(simpleMovingAverage([1, 2, 3, 4], 2.9)).toEqual([1, 1.5, 2.5, 3.5]);
    expect(simpleMovingAverage([1, 2, 3], 0)).toEqual([1, 2, 3]);
    expect(simpleMovingAverage([1, 2, 3], Number.NaN)).toEqual([1, 2, 3]);
  });

  it('handles empty, single-element, constant and non-finite inputs', () => {
    expect(simpleMovingAverage([], 3)).toEqual([]);
    expect(simpleMovingAverage([7], 3)).toEqual([7]);
    expect(simpleMovingAverage([7, 7, 7], 2)).toEqual([7, 7, 7]);
    expect(simpleMovingAverage([1, Number.NaN, 3, Number.POSITIVE_INFINITY, 5], 2)).toEqual([1, 2, 4]);
  });
});

describe('exponentialMovingAverage', () => {
  it('follows the smoothing recurrence with known values', () => {
    expect(exponentialMovingAverage([1, 2, 3, 4], 0.5)).toEqual([1, 1.5, 2.25, 3.125]);
    expect(exponentialMovingAverage([1, 2, 3, 4], 1)).toEqual([1, 2, 3, 4]);
    expect(exponentialMovingAverage([1, 2, 3, 4], 0)).toEqual([1, 1, 1, 1]);
  });

  it('honours a finite seed and clamps invalid alpha values', () => {
    expect(exponentialMovingAverage([1, 2, 3], 0.5, 0)).toEqual([0, 1, 2]);
    expect(exponentialMovingAverage([1, 2, 3], 2, 0)).toEqual([0, 2, 3]);
    expect(exponentialMovingAverage([1, 2, 3], Number.NaN, 10)).toEqual([10, 10, 10]);
    expect(exponentialMovingAverage([1, 2, 3], -1)).toEqual([1, 1, 1]);
  });

  it('handles empty, single-element, constant and non-finite inputs', () => {
    expect(exponentialMovingAverage([], 0.5)).toEqual([]);
    expect(exponentialMovingAverage([7], 0.5)).toEqual([7]);
    expect(exponentialMovingAverage([7, 7, 7], 0.5)).toEqual([7, 7, 7]);
    expect(exponentialMovingAverage([1, Number.NaN, 3, Number.POSITIVE_INFINITY], 0.5, Number.NaN)).toEqual([1, 2]);
  });
});
