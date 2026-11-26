import { describe, expect, it } from 'vitest';
import { stateFingerprint } from '@/engine/core/state';
import { SimulationEngine } from '@/engine/simulation/engine';
import { validateScenario } from '@/engine/validation';
import { disasterScenario } from './disaster';

function fingerprint(): string {
  const engine = new SimulationEngine(disasterScenario());
  engine.run(8);
  return stateFingerprint(engine.activeBranch.currentState);
}

describe('extra disaster preset', () => {
  it('is a valid, fully populated fictional response scenario', () => {
    const scenario = disasterScenario();
    const result = validateScenario(scenario);
    expect(result.valid, result.issues.map((issue) => issue.message).join(', ')).toBe(true);
    expect(result.issues).toEqual([]);
    expect(scenario.id).toBe('extra-disaster');
    expect(scenario.domain).toBe('disaster-response');
    expect(scenario.preset).toBe(true);
    expect(scenario.disclaimer).toBeTruthy();
    expect(scenario.variables.map((variable) => variable.key)).toEqual(expect.arrayContaining([
      'hazardIntensity', 'preparedness', 'evacuationCoverage', 'responseTime', 'recoveryProgress', 'resilience',
    ]));
    expect(scenario.rules.length).toBeGreaterThan(0);
    expect(scenario.events.length).toBeGreaterThan(0);
    expect(scenario.objectives.every((objective) => scenario.variables.some(
      (variable) => variable.key === objective.variableKey,
    ))).toBe(true);
    expect(scenario.tags).toEqual(expect.arrayContaining(['disaster', 'exercise']));
  });

  it('replays the same fingerprint from the same seed', () => {
    expect(fingerprint()).toBe(fingerprint());
  });

  it('returns independent scenarios on each call', () => {
    const first = disasterScenario();
    const second = disasterScenario();
    first.variables[0]!.initial = 999;
    expect(second.variables[0]!.initial).toBe(30);
    expect(second).not.toBe(first);
  });
});
