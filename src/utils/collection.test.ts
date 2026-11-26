import { describe, expect, it } from 'vitest';
import { chunk, groupBy, keyBy, partition, uniqueBy } from './collection';

interface Row {
  readonly id: string;
  readonly category: string;
}

const rows: readonly Row[] = [
  { id: 'a', category: 'even' },
  { id: 'b', category: 'odd' },
  { id: 'c', category: 'even' },
];

describe('collection helpers', () => {
  it('groups values in first-seen order', () => {
    const groups = groupBy(rows, (row) => row.category);
    expect([...groups.keys()]).toEqual(['even', 'odd']);
    expect(groups.get('even')).toEqual([rows[0], rows[2]]);
    expect(groups.get('odd')).toEqual([rows[1]]);
  });

  it('indexes by key and keeps the first unique value', () => {
    const indexed = keyBy(rows, (row) => row.category);
    expect(indexed.get('even')).toEqual({ id: 'c', category: 'even' });
    expect([...indexed.keys()]).toEqual(['even', 'odd']);
    expect(uniqueBy(rows, (row) => row.category)).toEqual([rows[0], rows[1]]);
  });

  it('partitions values without changing order', () => {
    const [even, odd] = partition([1, 2, 3, 4], (value) => value % 2 === 0);
    expect(even).toEqual([2, 4]);
    expect(odd).toEqual([1, 3]);
  });

  it('chunks values and validates the size', () => {
    const values = [1, 2, 3, 4, 5] as const;
    expect(chunk(values, 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunk(values, 10)).toEqual([[1, 2, 3, 4, 5]]);
    expect(() => chunk(values, 0)).toThrow('Chunk size must be a positive integer');
    expect(() => chunk(values, 1.5)).toThrow('Chunk size must be a positive integer');
  });
});
