import { describe, expect, it } from 'vitest';
import { sortRowsByColumn, type TableRow } from './resultTable';

function rows(): TableRow[] {
  return [
    { id: 'b', name: 'Bravo', values: { score: 2 } },
    { id: 'a', name: 'Alpha', values: { score: 2 } },
    { id: 'c', name: 'Charlie', values: { score: 1 } },
  ];
}

describe('sortRowsByColumn', () => {
  it('sorts numerically in both directions', () => {
    expect(sortRowsByColumn(rows(), 'score').map((row) => row.id)).toEqual(['c', 'a', 'b']);
    expect(sortRowsByColumn(rows(), 'score', 'desc').map((row) => row.id)).toEqual(['a', 'b', 'c']);
  });

  it('breaks ties by id, then name, regardless of direction', () => {
    expect(sortRowsByColumn(rows(), 'score').map((row) => row.name)).toEqual(['Charlie', 'Alpha', 'Bravo']);
    const sameId: TableRow[] = [
      { id: 'x', name: 'Zed', values: { score: 1 } },
      { id: 'x', name: 'Ada', values: { score: 1 } },
    ];
    expect(sortRowsByColumn(sameId, 'score').map((row) => row.name)).toEqual(['Ada', 'Zed']);
    expect(sortRowsByColumn(sameId, 'score', 'desc').map((row) => row.name)).toEqual(['Ada', 'Zed']);
  });

  it('treats missing and non-finite values as zero and keeps full ties stable', () => {
    const mixed: TableRow[] = [
      { id: 'z', name: 'Zulu', values: {} },
      { id: 'y', name: 'Yankee', values: { score: Number.NaN } },
      { id: 'x', name: 'Xray', values: { score: -1 } },
      { id: 'w', name: 'Whiskey', values: { score: 0 } },
    ];
    expect(sortRowsByColumn(mixed, 'score').map((row) => row.id)).toEqual(['x', 'w', 'y', 'z']);
    const tied: TableRow[] = [
      { id: 'same', name: 'Same', values: { score: 1 } },
      { id: 'same', name: 'Same', values: { score: 1 } },
      { id: 'same', name: 'Same', values: { score: 1 } },
    ];
    const sorted = sortRowsByColumn(tied, 'score');
    expect(sorted).toHaveLength(3);
    expect(sorted[0]).toBe(tied[0]);
    expect(sorted[1]).toBe(tied[1]);
    expect(sorted[2]).toBe(tied[2]);
  });

  it('does not mutate the input array', () => {
    const input = rows();
    const originalOrder = input.map((row) => row.id);
    sortRowsByColumn(input, 'score');
    expect(input.map((row) => row.id)).toEqual(originalOrder);
  });

  it('handles empty and single-element tables', () => {
    const single: TableRow[] = [{ id: 'a', name: 'Alpha', values: { score: 1 } }];
    expect(sortRowsByColumn([], 'score')).toEqual([]);
    expect(sortRowsByColumn(single, 'score')).toEqual(single);
  });
});
