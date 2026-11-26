import { describe, expect, it } from 'vitest';
import { firstDownwardCrossing, firstUpwardCrossing } from './firstPassage';

describe('firstUpwardCrossing', () => {
  it('reports the first strictly upward crossing index and value', () => {
    expect(firstUpwardCrossing([1, 2, 3, 4], 2.5)).toEqual({ index: 2, value: 3 });
    expect(firstUpwardCrossing([0, 0, 1, 2], 0)).toEqual({ index: 2, value: 1 });
    expect(firstUpwardCrossing([1, 2, 3], 3)).toBeNull();
  });

  it('returns null for downward-only, constant, empty and single-element series', () => {
    expect(firstUpwardCrossing([3, 2, 1], 1.5)).toBeNull();
    expect(firstUpwardCrossing([2, 2, 2], 2)).toBeNull();
    expect(firstUpwardCrossing([], 1)).toBeNull();
    expect(firstUpwardCrossing([9], 1)).toBeNull();
  });

  it('skips non-finite samples and rejects invalid thresholds', () => {
    expect(firstUpwardCrossing([1, Number.NaN, 3, Number.POSITIVE_INFINITY], 2)).toEqual({ index: 2, value: 3 });
    expect(firstUpwardCrossing([0, 1], Number.NaN)).toBeNull();
    expect(firstUpwardCrossing([0, 1], Number.POSITIVE_INFINITY)).toBeNull();
  });
});

describe('firstDownwardCrossing', () => {
  it('reports the first strictly downward crossing index and value', () => {
    expect(firstDownwardCrossing([5, 4, 3, 2], 3.5)).toEqual({ index: 2, value: 3 });
    expect(firstDownwardCrossing([2, 1, 0], 2)).toEqual({ index: 1, value: 1 });
    expect(firstDownwardCrossing([3, 2, 1], 1)).toBeNull();
  });

  it('returns null for upward-only, constant, empty and single-element series', () => {
    expect(firstDownwardCrossing([1, 2, 3], 1.5)).toBeNull();
    expect(firstDownwardCrossing([2, 2, 2], 2)).toBeNull();
    expect(firstDownwardCrossing([], 1)).toBeNull();
    expect(firstDownwardCrossing([9], 10)).toBeNull();
  });

  it('skips non-finite samples and rejects invalid thresholds', () => {
    expect(firstDownwardCrossing([3, Number.NaN, 1, 0], 2)).toEqual({ index: 2, value: 1 });
    expect(firstDownwardCrossing([1, 0], Number.NEGATIVE_INFINITY)).toBeNull();
  });
});
