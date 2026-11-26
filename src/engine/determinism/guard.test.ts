import { describe, expect, it } from 'vitest';
import { createInitialState } from '@/engine/core/state';
import type { WorldState } from '@/engine/types';
import { guardStateTransition, validateSerializable } from './guard';

const state = (): WorldState => createInitialState({ definitions: [], seed: 1 });
const withValue = (value: unknown): WorldState => ({
  ...state(),
  variables: { population: value as WorldState['variables'][string] },
});

describe('state transition guard', () => {
  it('accepts serializable world states', () => {
    const result = guardStateTransition(state(), state());
    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it('rejects functions, symbols, bigint and undefined with paths', () => {
    expect(validateSerializable(withValue(() => 1), 'state').issues[0]).toMatchObject({
      path: 'state.variables.population',
      severity: 'error',
      message: expect.stringMatching(/Functions/),
    });
    expect(validateSerializable(withValue(Symbol('x'))).issues[0]?.message).toMatch(/Symbols/);
    expect(validateSerializable(withValue(10n)).issues[0]?.message).toMatch(/BigInt/);
    expect(validateSerializable(withValue(undefined)).issues[0]?.message).toMatch(/Undefined/);
  });

  it('detects circular references but allows repeated non-circular references', () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    const result = validateSerializable({ root: circular }, 'value');
    expect(result.valid).toBe(false);
    expect(result.issues[0]).toMatchObject({ path: 'value.root.self', severity: 'error' });
    expect(result.issues[0]?.message).toMatch(/Circular/);

    const shared = { value: 1 };
    expect(validateSerializable({ left: shared, right: shared }).valid).toBe(true);
  });

  it('guards both the next state and an optional previous state', () => {
    expect(guardStateTransition(withValue(10n)).valid).toBe(false);
    expect(guardStateTransition(state(), withValue(() => 1)).issues[0]?.path).toMatch(/^previousState\./);
    expect(guardStateTransition(withValue(10n), withValue(20n)).issues).toHaveLength(2);
    expect(guardStateTransition(withValue(undefined)).issues[0]?.path).toBe('state.variables.population');
  });

  it('allows omitted optional fields inside nested engine records', () => {
    const withActiveEvent: WorldState = {
      ...state(),
      activeEvents: [{
        instanceId: 'i1', eventId: 'e1', name: 'Event', startedAt: 0, startedStep: 0,
        severity: 'info', source: 'manual',
      }],
    };
    expect(guardStateTransition(withActiveEvent).valid).toBe(true);
  });
});
