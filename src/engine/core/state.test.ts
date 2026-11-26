import { describe, expect, it } from 'vitest';
import type { VariableDefinition } from '@/engine/types';
import { advanceClock, cloneState, createInitialState, restoreState, stateFingerprint, statesEqual } from './state';

const definitions: VariableDefinition[] = [
  { id: 'v1', key: 'population', name: 'Population', type: 'number', initial: 100 },
  { id: 'v2', key: 'stable', name: 'Stable', type: 'boolean', initial: true },
];

describe('world state lifecycle', () => {
  it('initializes independent states from definitions', () => {
    const a = createInitialState({ definitions, seed: 42 });
    const b = createInitialState({ definitions, seed: 42 });
    expect(a.variables).toEqual({ v1: 100, v2: true });
    expect(statesEqual(a, b)).toBe(true);
    a.variables.v1 = 999;
    expect(b.variables.v1).toBe(100);
  });

  it('advances the simulation clock without mutating the source', () => {
    const state = createInitialState({ definitions, seed: 1, stepDuration: 2 });
    const next = advanceClock(state, 2);
    expect(next.step).toBe(1);
    expect(next.time).toBe(2);
    expect(next.parentId).toBe(state.id);
    expect(state.step).toBe(0);
  });

  it('clones and restores states with new identity', () => {
    const state = createInitialState({ definitions, seed: 3 });
    const copy = cloneState(state);
    copy.variables.v1 = 5;
    expect(state.variables.v1).toBe(100);
    const restored = restoreState(copy);
    expect(restored.variables.v1).toBe(5);
    expect(restored.id).not.toBe(copy.id);
    expect(restored.parentId).toBe(copy.id);
  });

  it('produces canonical fingerprints insensitive to key insertion order', () => {
    const state = createInitialState({ definitions, seed: 1 });
    const reordered = { ...state, variables: { v2: true, v1: 100 } };
    expect(stateFingerprint(state)).toBe(stateFingerprint(reordered));
  });
});
