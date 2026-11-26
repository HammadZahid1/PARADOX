import { describe, expect, it } from 'vitest';
import type { WorldDefinition, WorldState } from '@/engine/types';
import { stateIntegrity, validateWorldDefinition, validateWorldState } from './world';

const state: WorldState = {
  id: 's1', time: 0, step: 0, variables: {}, parameters: {}, activeEvents: [],
  eventHistory: [], metrics: {}, seed: 1, version: 1, changes: [],
};
const world: WorldDefinition = {
  id: 'w1', name: 'Test World', domain: 'test',
  variables: [{ id: 'v1', key: 'x', name: 'X', type: 'number', initial: 1 }],
  parameters: {},
};

describe('world validation', () => {
  it('validates basic world states', () => {
    expect(validateWorldState(state).valid).toBe(true);
    expect(validateWorldState({ ...state, time: -1 }).valid).toBe(false);
    expect(validateWorldState({ ...state, version: 0 }).valid).toBe(false);
  });

  it('validates world definitions and duplicate keys', () => {
    expect(validateWorldDefinition(world).valid).toBe(true);
    expect(validateWorldDefinition({ ...world, variables: [...world.variables, world.variables[0]!] }).valid).toBe(false);
  });

  it('checks state integrity', () => {
    expect(stateIntegrity(state).valid).toBe(true);
    expect(stateIntegrity({ ...state, variables: { broken: undefined as never } }).valid).toBe(false);
  });
});
