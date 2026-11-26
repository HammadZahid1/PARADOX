import { describe, expect, it } from 'vitest';
import { approximateSobolIndices } from './sobolApprox';

describe('approximateSobolIndices', () => {
  it('recovers analytic first-order shares for an additive grid', () => {
    const result = approximateSobolIndices([
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
    ]);
    expect(result.variance).toBeCloseTo(20 / 3, 12);
    expect(result.firstOrderRow).toBeCloseTo(0.1, 12);
    expect(result.firstOrderColumn).toBeCloseTo(0.9, 12);
    expect(result.interaction).toBeCloseTo(0, 12);
  });

  it('attributes equal variance to first-order and interaction for a product grid', () => {
    const result = approximateSobolIndices([
      [0, 0],
      [0, 1],
    ]);
    expect(result.variance).toBeCloseTo(0.1875, 12);
    expect(result.firstOrderRow).toBeCloseTo(1 / 3, 12);
    expect(result.firstOrderColumn).toBeCloseTo(1 / 3, 12);
    expect(result.interaction).toBeCloseTo(1 / 3, 12);
  });

  it('returns zeros for empty, constant and single-cell grids', () => {
    const empty = { firstOrderRow: 0, firstOrderColumn: 0, interaction: 0, variance: 0 };
    expect(approximateSobolIndices([])).toEqual(empty);
    expect(approximateSobolIndices([[]])).toEqual(empty);
    expect(approximateSobolIndices([[5, 5], [5, 5]])).toEqual(empty);
    expect(approximateSobolIndices([[7]])).toEqual(empty);
  });

  it('truncates ragged rows and treats non-finite cells as zero', () => {
    const result = approximateSobolIndices([
      [0, 10, Number.NaN],
      [10, 20],
    ]);
    expect(result.variance).toBeCloseTo(50, 12);
    expect(result.firstOrderRow).toBeCloseTo(0.5, 12);
    expect(result.firstOrderColumn).toBeCloseTo(0.5, 12);
    expect(result.interaction).toBeCloseTo(0, 12);
  });
});
