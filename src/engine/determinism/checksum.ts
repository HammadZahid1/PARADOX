import { stateFingerprint } from '@/engine/core/state';
import type { WorldState } from '@/engine/types';
import { hashString } from '@/utils/id';

/** FNV-1a 32-bit hash. Delegates to the shared local hash to keep one implementation. */
export function fnv1a(input: string): number {
  return hashString(input);
}

/** Canonical JSON representation with sorted object keys and preserved array order. */
export function stableStringify(value: unknown): string {
  return serialize(value, new Set<object>());
}

function serialize(value: unknown, ancestors: ReadonlySet<object>): string {
  if (value === null || typeof value !== 'object') {
    const encoded = JSON.stringify(value);
    return encoded === undefined ? 'null' : encoded;
  }
  if (ancestors.has(value)) throw new TypeError('Cannot checksum a circular value');
  const next = new Set(ancestors);
  next.add(value);
  if (Array.isArray(value)) {
    return `[${value.map((item) => serialize(item, next)).join(',')}]`;
  }
  const entries = Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${serialize((value as Record<string, unknown>)[key], next)}`);
  return `{${entries.join(',')}}`;
}

/** Deterministic checksum of any JSON-serializable value. */
export function valueChecksum(value: unknown): number {
  return fnv1a(stableStringify(value));
}

/** Deterministic checksum of a WorldState derived from its canonical fingerprint. */
export function stateChecksum(state: WorldState): number {
  return fnv1a(stateFingerprint(state));
}
