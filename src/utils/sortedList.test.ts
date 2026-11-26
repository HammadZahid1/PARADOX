import { describe, expect, it } from 'vitest';
import { findSorted, insertSorted, lowerBound, removeAllSorted, removeSorted } from './sortedList';

const byNumber = (left: number, right: number): number => left - right;

describe('immutable sorted lists', () => {
  it('inserts values at the lower bound without mutating input', () => {
    const source: readonly number[] = [1, 3, 5];
    expect(insertSorted(source, 4, byNumber)).toEqual([1, 3, 4, 5]);
    expect(insertSorted(source, 3, byNumber)).toEqual([1, 3, 3, 5]);
    expect(source).toEqual([1, 3, 5]);
    expect(insertSorted([], 2, byNumber)).toEqual([2]);
  });

  it('looks up values with the comparator', () => {
    expect(findSorted([1, 3, 5], 3, byNumber)).toBe(3);
    expect(findSorted([1, 3, 5], 4, byNumber)).toBeUndefined();
    expect(findSorted([], 1, byNumber)).toBeUndefined();
    expect(lowerBound([1, 3, 3, 5], 3, byNumber)).toBe(1);
    expect(lowerBound([1, 3, 5], 6, byNumber)).toBe(3);
  });

  it('removes one or all matching values immutably', () => {
    const source: readonly number[] = [1, 2, 2, 3];
    expect(removeSorted(source, 2, byNumber)).toEqual([1, 2, 3]);
    expect(removeAllSorted(source, 2, byNumber)).toEqual([1, 3]);
    expect(removeSorted(source, 9, byNumber)).toEqual([1, 2, 2, 3]);
    expect(source).toEqual([1, 2, 2, 3]);
  });

  it('supports comparators over objects', () => {
    type Item = { readonly id: number };
    const byId = (left: Item, right: Item): number => left.id - right.id;
    const items: readonly Item[] = [{ id: 1 }, { id: 4 }];
    expect(insertSorted(items, { id: 2 }, byId)).toEqual([{ id: 1 }, { id: 2 }, { id: 4 }]);
    expect(findSorted(items, { id: 4 }, byId)).toEqual({ id: 4 });
    expect(removeSorted(items, { id: 1 }, byId)).toEqual([{ id: 4 }]);
  });
});
