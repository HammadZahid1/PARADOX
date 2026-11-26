import { describe, expect, it } from 'vitest';
import type { EventRecord, SimulationEvent, VariableDefinition, WorldState } from '@/engine/types';
import { SeededRandom } from '@/engine/random/rng';
import { cooldownActive, evaluateTrigger } from './triggers';

const definitions: VariableDefinition[] = [{ id: 'v1', key: 'resources', name: 'Resources', type: 'number', initial: 50 }];
const state: WorldState = {
  id: 's', step: 3, time: 3, seed: 1, version: 1,
  variables: { v1: 10 }, parameters: {}, activeEvents: [], eventHistory: [], metrics: {}, changes: [],
};
const event: SimulationEvent = {
  id: 'e1', name: 'Shock', type: 'conditional', trigger: { kind: 'threshold', variableKey: 'resources', operator: 'lt', value: 20 },
  probability: 1, conditions: [], effects: [], dependencies: [], priority: 1, severity: 'warning', enabled: true,
};
const context = { state, definitions, random: new SeededRandom(1), step: 3, history: [] as EventRecord[], mode: 'deterministic' as const };

const record = (id: string, step: number): EventRecord => ({
  id: `r${step}`, eventId: id, eventName: id, step, time: step, severity: 'info', source: 'test', affectedVariables: [],
});

describe('event triggers', () => {
  it('evaluates threshold triggers', () => {
    expect(evaluateTrigger(event, context).fired).toBe(true);
    expect(evaluateTrigger({ ...event, trigger: { kind: 'threshold', variableKey: 'resources', operator: 'gt', value: 20 } }, context).fired).toBe(false);
  });

  it('evaluates scheduled, recurring and dependency triggers', () => {
    expect(evaluateTrigger({ ...event, trigger: { kind: 'scheduled', atStep: 3 } }, context).fired).toBe(true);
    expect(evaluateTrigger({ ...event, trigger: { kind: 'scheduled', atStep: 4 } }, context).fired).toBe(false);
    expect(evaluateTrigger({ ...event, trigger: { kind: 'recurring', intervalSteps: 3 } }, context).fired).toBe(true);
    expect(evaluateTrigger({ ...event, trigger: { kind: 'dependency', eventIds: ['x'], requireAll: true } }, context).fired).toBe(false);
    expect(evaluateTrigger({ ...event, trigger: { kind: 'dependency', eventIds: ['x'] } }, { ...context, history: [record('x', 1)] }).fired).toBe(true);
  });

  it('respects disabled events and unmet conditions', () => {
    expect(evaluateTrigger({ ...event, enabled: false }, context).reason).toBe('disabled');
    const conditional = { ...event, conditions: [{ id: 'c', variableKey: 'resources', operator: 'gt' as const, value: 100 }] };
    expect(evaluateTrigger(conditional, context).fired).toBe(false);
  });

  it('uses deterministic probability gating and cooldowns', () => {
    expect(evaluateTrigger({ ...event, probability: 0.5 }, context).fired).toBe(false);
    expect(evaluateTrigger({ ...event, probability: 0.5 }, { ...context, mode: 'probabilistic' }).probability).toBe(0.5);
    expect(cooldownActive({ ...event, cooldownSteps: 5 }, 3, [record('e1', 1)])).toBe(true);
    expect(cooldownActive(event, 3, [])).toBe(false);
  });
});
