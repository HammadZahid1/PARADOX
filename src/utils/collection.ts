/** Stable collection transforms over readonly inputs. */

export function groupBy<T, K extends PropertyKey>(values: readonly T[], keyOf: (item: T) => K): Map<K, T[]> {
  const groups = new Map<K, T[]>();
  for (const item of values) {
    const key = keyOf(item);
    const group = groups.get(key);
    if (group) group.push(item);
    else groups.set(key, [item]);
  }
  return groups;
}

export function keyBy<T, K extends PropertyKey>(values: readonly T[], keyOf: (item: T) => K): Map<K, T> {
  const indexed = new Map<K, T>();
  for (const item of values) indexed.set(keyOf(item), item);
  return indexed;
}

export function uniqueBy<T, K extends PropertyKey>(values: readonly T[], keyOf: (item: T) => K): T[] {
  const seen = new Set<K>();
  const unique: T[] = [];
  for (const item of values) {
    const key = keyOf(item);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
  }
  return unique;
}

export function partition<T>(values: readonly T[], predicate: (item: T) => boolean): [T[], T[]] {
  const matching: T[] = [];
  const remaining: T[] = [];
  for (const item of values) {
    if (predicate(item)) matching.push(item);
    else remaining.push(item);
  }
  return [matching, remaining];
}

export function chunk<T>(values: readonly T[], size: number): T[][] {
  if (!Number.isInteger(size) || size <= 0) throw new Error('Chunk size must be a positive integer');
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) chunks.push(values.slice(index, index + size));
  return chunks;
}
