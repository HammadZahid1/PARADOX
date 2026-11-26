import { describe, expect, it } from 'vitest';
import { stateFingerprint } from '@/engine/core/state';
import { SimulationEngine } from '@/engine/simulation/engine';
import { validateScenario } from '@/engine/validation';
import { healthcareScenario } from './healthcare';

function fingerprint(): string {
  const engine = new SimulationEngine(healthcareScenario());
  engine.run(8);
  return stateFingerprint(engine.activeBranch.currentState);
}

describe('extra healthcare preset', () => {
  it('is a valid, fully populated fictional scenario', () => {
    const scenario = healthcareScenario();
    const result = validateScenario(scenario);
    expect(result.valid, result.issues.map((issue) => issue.message).join(', ')).toBe(true);
    expect(result.issues).toEqual([]);
    expect(scenario.id).toBe('extra-healthcare');
    expect(scenario.domain).toBe('healthcare');
    expect(scenario.preset).toBe(true);
    expect(scenario.disclaimer).toMatch(/fictional/i);
    expect(scenario.variables.map((variable) => variable.key)).toEqual(expect.arrayContaining([
      'patientsWaiting', 'bedOccupancy', 'staffCoverage', 'emergencyArrivals', 'supplyStock', 'careLoad',
    ]));
    expect(scenario.rules.length).toBeGreaterThan(0);
    expect(scenario.events.length).toBeGreaterThan(0);
    expect(scenario.objectives.every((objective) => scenario.variables.some(
      (variable) => variable.key === objective.variableKey,
    ))).toBe(true);
    expect(scenario.tags).toContain('healthcare');
    expect(scenario.configuration.mode).toBe('deterministic');
  });

  it('replays the same fingerprint from the same seed', () => {
    expect(fingerprint()).toBe(fingerprint());
  });

  it('returns independent scenarios on each call', () => {
    const first = healthcareScenario();
    const second = healthcareScenario();
    first.variables[0]!.initial = 999;
    expect(second.variables[0]!.initial).toBe(120);
    expect(second).not.toBe(first);
  });
});
