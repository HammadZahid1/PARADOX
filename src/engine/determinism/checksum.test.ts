import { describe, expect, it } from 'vitest';
import { createInitialState } from '@/engine/core/state';
import type { VariableDefinition, WorldState } from '@/engine/types';
import { fnv1a, stableStringify, stateChecksum, valueChecksum } from './checksum';

const definitions: VariableDefinition[] = [
  { id: 'v1', key: 'population', name: 'Population', type: 'number', initial: 100 },
  { id: 'v2', key: 'stable', name: 'Stable', type: 'boolean', initial: true },
];
const initialState = (): WorldState => createInitialState({ definitions, seed: 7 });

describe('deterministic checksums', () => {
  it('uses the FNV-1a offset basis and hashes text reproducibly', () => {
    expect(fnv1a('')).toBe(2166136261);
    expect(fnv1a('a')).toBe(3826002220);
    expect(fnv1a('a')).not.toBe(fnv1a('b'));
  });

  it('stable stringify sorts object keys but preserves array order', () => {
    expect(stableStringify({ b: 1, a: { d: 2, c: 3 } })).toBe('{"a":{"c":3,"d":2},"b":1}');
    expect(stableStringify([1, 2])).not.toBe(stableStringify([2, 1]));
  });

  it('checksums arbitrary serializable values independent of insertion order', () => {
    expect(valueChecksum({ b: 2, a: [1, 2] })).toBe(valueChecksum({ a: [1, 2], b: 2 }));
    expect(valueChecksum({ x: 1 })).not.toBe(valueChecksum({ x: 2 }));
  });

  it('checksums world states from their canonical fingerprint', () => {
    const state = initialState();
    const reordered = { ...state, variables: { v2: true, v1: 100 } };
    expect(stateChecksum(state)).toBe(stateChecksum(reordered));
    expect(stateChecksum({ ...state, step: 1 })).not.toBe(stateChecksum(state));
    const changed = { ...state, variables: { ...state.variables, v1: 101 } };
    expect(stateChecksum(changed)).not.toBe(stateChecksum(state));
  });

  it('fails loudly instead of recursing forever on circular values', () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(() => valueChecksum(circular)).toThrow(/circular/i);
  });
});
