import { describe, expect, it } from 'vitest';
import type { SimulationEvent } from '@/engine/types';
import { validateEvent, validateTrigger } from './events';

const base: SimulationEvent = {
  id: 'e1', name: 'Market shock', type: 'scheduled',
  trigger: { kind: 'scheduled', atStep: 3 }, probability: 1,
  conditions: [], effects: [{ kind: 'decrease', variableKey: 'demand', amount: 10 }],
  dependencies: [], priority: 1, severity: 'warning', enabled: true,
};

describe('event validation', () => {
  it('validates a well-formed event', () => {
    expect(validateEvent(base).valid).toBe(true);
  });

  it('rejects invalid probabilities and triggers', () => {
    expect(validateEvent({ ...base, probability: 1.5 }).valid).toBe(false);
    expect(validateTrigger({ kind: 'scheduled', atStep: -1 }).valid).toBe(false);
    expect(validateTrigger({ kind: 'recurring', intervalSteps: 0 }).valid).toBe(false);
    expect(validateTrigger({ kind: 'manual' }).valid).toBe(true);
  });

  it('validates nested effects and outcomes', () => {
    expect(validateEvent({ ...base, effects: [{ kind: 'temporary', variableKey: 'x', delta: 2, durationSteps: 3 }] }).valid).toBe(true);
    expect(validateEvent({ ...base, effects: [{ kind: 'increase', variableKey: 'x', amount: Number.NaN }] }).valid).toBe(false);
    expect(validateEvent({ ...base, outcomes: [{ id: 'o', name: 'Outcome', probability: 0.5, effects: [{ kind: 'log', message: 'seen' }] }] }).valid).toBe(true);
  });
});
