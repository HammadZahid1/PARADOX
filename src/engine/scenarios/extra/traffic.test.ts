import { describe, expect, it } from 'vitest';
import { stateFingerprint } from '@/engine/core/state';
import { SimulationEngine } from '@/engine/simulation/engine';
import { validateScenario } from '@/engine/validation';
import { trafficScenario } from './traffic';

function fingerprint(): string {
  const engine = new SimulationEngine(trafficScenario());
  engine.run(8);
  return stateFingerprint(engine.activeBranch.currentState);
}

describe('extra traffic preset', () => {
  it('is a valid, fully populated fictional corridor scenario', () => {
    const scenario = trafficScenario();
    const result = validateScenario(scenario);
    expect(result.valid, result.issues.map((issue) => issue.message).join(', ')).toBe(true);
    expect(result.issues).toEqual([]);
    expect(scenario.id).toBe('extra-traffic');
    expect(scenario.domain).toBe('traffic');
    expect(scenario.preset).toBe(true);
    expect(scenario.disclaimer).toBeTruthy();
    expect(scenario.variables.map((variable) => variable.key)).toEqual(expect.arrayContaining([
      'trafficVolume', 'signalEfficiency', 'transitCapacity', 'commuteTime', 'congestionIndex',
    ]));
    expect(scenario.rules.length).toBeGreaterThan(0);
    expect(scenario.events.length).toBeGreaterThan(0);
    expect(scenario.objectives.every((objective) => scenario.variables.some(
      (variable) => variable.key === objective.variableKey,
    ))).toBe(true);
    expect(scenario.tags).toContain('traffic');
  });

  it('replays the same fingerprint from the same seed', () => {
    expect(fingerprint()).toBe(fingerprint());
  });

  it('returns independent scenarios on each call', () => {
    const first = trafficScenario();
    const second = trafficScenario();
    first.variables[0]!.initial = 999;
    expect(second.variables[0]!.initial).toBe(100);
    expect(second).not.toBe(first);
  });
});
