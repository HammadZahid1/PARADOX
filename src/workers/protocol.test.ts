import { describe, expect, it } from 'vitest';
import { createAllPresets } from '@/engine/scenarios';
import { createMonteRunRequest, isMonteCancelMessage, isMonteRunMessage } from './protocol';

const scenario = createAllPresets()[0]!;

describe('Monte Carlo worker protocol', () => {
  it('creates a typed run request carrying the scenario', () => {
    const message = createMonteRunRequest('req_1', {
      scenarioId: scenario.id, runs: 5, baseSeed: 42, maxSteps: 10, variableKey: scenario.variables[0]!.key,
    }, scenario);
    expect(isMonteRunMessage(message)).toBe(true);
    expect(message.scenario.id).toBe(scenario.id);
  });

  it('recognizes cancel messages and rejects malformed input', () => {
    expect(isMonteCancelMessage({ type: 'monte:cancel', requestId: 'r' })).toBe(true);
    expect(isMonteCancelMessage({ type: 'monte:cancel' })).toBe(false);
    expect(isMonteRunMessage(null)).toBe(false);
  });
});
