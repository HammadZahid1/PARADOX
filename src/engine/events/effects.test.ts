import { describe, expect, it } from 'vitest';
import type { SimulationEvent, VariableDefinition, WorldState } from '@/engine/types';
import { SeededRandom } from '@/engine/random/rng';
import { applyEventEffects, expireTemporaryEffects } from './effects';

const definitions: VariableDefinition[] = [
  { id: 'v1', key: 'resources', name: 'Resources', type: 'number', initial: 100 },
  { id: 'v2', key: 'stable', name: 'Stable', type: 'boolean', initial: true },
];
const state: WorldState = {
  id: 's', step: 2, time: 2, seed: 1, version: 1,
  variables: { v1: 100, v2: true }, parameters: {}, activeEvents: [], eventHistory: [], metrics: {}, changes: [],
};
const event: SimulationEvent = {
  id: 'e1', name: 'Shortage', type: 'manual', trigger: { kind: 'manual' }, probability: 1,
  conditions: [], effects: [{ kind: 'decrease', variableKey: 'resources', amount: 30 }, { kind: 'log', message: 'shortage applied' }],
  dependencies: [], priority: 1, severity: 'warning', enabled: true,
};

describe('event effects', () => {
  it('applies numeric effects and captures logs', () => {
    const result = applyEventEffects(event, state, definitions, new SeededRandom(1), { eventId: 'e1', step: 2, fired: true, reason: 'test', effectsApplied: 0 });
    expect(result.state.variables.v1).toBe(70);
    expect(result.changedVariables).toEqual(['resources']);
    expect(result.log).toEqual(['shortage applied']);
  });

  it('selects a single weighted outcome', () => {
    const withOutcomes = {
      ...event,
      effects: [],
      outcomes: [{ id: 'o1', name: 'Mild', probability: 0.5, effects: [{ kind: 'decrease' as const, variableKey: 'resources', amount: 5 }] }],
    };
    const result = applyEventEffects(withOutcomes, state, definitions, new SeededRandom(1), { eventId: 'e1', step: 2, fired: true, reason: 'test', effectsApplied: 0 });
    expect(result.outcomeId).toBe('o1');
    expect(result.state.variables.v1).toBe(95);
  });

  it('applies and reverts temporary effects', () => {
    const temporary = { ...event, effects: [{ kind: 'temporary' as const, variableKey: 'resources', delta: -10, durationSteps: 2 }] };
    const applied = applyEventEffects(temporary, state, definitions, new SeededRandom(1), { eventId: 'e1', step: 2, fired: true, reason: 'test', effectsApplied: 0 });
    expect(applied.state.variables.v1).toBe(90);
    expect(applied.state.activeEvents).toHaveLength(1);
    const expired = expireTemporaryEffects(applied.state, 4, definitions);
    expect(expired.variables.v1).toBe(100);
    expect(expired.activeEvents).toHaveLength(0);
  });

  it('tracks activation and cancellation requests', () => {
    const control = { ...event, effects: [{ kind: 'activate' as const, eventId: 'e2' }, { kind: 'cancel' as const, eventId: 'e3' }] };
    const result = applyEventEffects(control, state, definitions, new SeededRandom(1), { eventId: 'e1', step: 2, fired: true, reason: 'test', effectsApplied: 0 });
    expect(result.activatedEvents).toEqual(['e2']);
    expect(result.cancelledEvents).toEqual(['e3']);
  });
});
