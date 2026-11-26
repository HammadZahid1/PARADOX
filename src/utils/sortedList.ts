/** Immutable binary-search helpers for sorted arrays. */

export type Comparator<T> = (left: T, right: T) => number;

export function lowerBound<T>(values: readonly T[], value: T, compare: Comparator<T>): number {
  let low = 0;
  let high = values.length;
  while (low < high) {
    // The midpoint is always inside the array while the search is active.
    const middle = Math.floor((low + high) / 2);
    if (compare(values[middle] as T, value) < 0) low = middle + 1;
    else high = middle;
  }
  return low;
}

export function insertSorted<T>(values: readonly T[], value: T, compare: Comparator<T>): T[] {
  const index = lowerBound(values, value, compare);
  return [...values.slice(0, index), value, ...values.slice(index)];
}

export function findSorted<T>(values: readonly T[], value: T, compare: Comparator<T>): T | undefined {
  const index = lowerBound(values, value, compare);
  if (index >= values.length) return undefined;
  const found = values[index] as T;
  return compare(found, value) === 0 ? found : undefined;
}

export function removeSorted<T>(values: readonly T[], value: T, compare: Comparator<T>): T[] {
  const index = lowerBound(values, value, compare);
  if (index >= values.length || compare(values[index] as T, value) !== 0) return [...values];
  return [...values.slice(0, index), ...values.slice(index + 1)];
}

export function removeAllSorted<T>(values: readonly T[], value: T, compare: Comparator<T>): T[] {
  const start = lowerBound(values, value, compare);
  let end = start;
  while (end < values.length && compare(values[end] as T, value) === 0) end += 1;
  if (start === end) return [...values];
  return [...values.slice(0, start), ...values.slice(end)];
}
