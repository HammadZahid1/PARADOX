import { describe, expect, it } from 'vitest';
import { stateFingerprint } from '@/engine/core/state';
import { SimulationEngine } from '@/engine/simulation/engine';
import { validateScenario } from '@/engine/validation';
import { energyScenario } from './energy';

function fingerprint(): string {
  const engine = new SimulationEngine(energyScenario());
  engine.run(8);
  return stateFingerprint(engine.activeBranch.currentState);
}

describe('extra energy preset', () => {
  it('is a valid, fully populated fictional grid scenario', () => {
    const scenario = energyScenario();
    const result = validateScenario(scenario);
    expect(result.valid, result.issues.map((issue) => issue.message).join(', ')).toBe(true);
    expect(result.issues).toEqual([]);
    expect(scenario.id).toBe('extra-energy');
    expect(scenario.domain).toBe('energy');
    expect(scenario.preset).toBe(true);
    expect(scenario.disclaimer).toBeTruthy();
    expect(scenario.variables.map((variable) => variable.key)).toEqual(expect.arrayContaining([
      'demand', 'dispatchableGeneration', 'windOutput', 'batteryCharge', 'reserveMargin', 'netBalance',
    ]));
    expect(scenario.rules.length).toBeGreaterThan(0);
    expect(scenario.events.length).toBeGreaterThan(0);
    expect(scenario.objectives.every((objective) => scenario.variables.some(
      (variable) => variable.key === objective.variableKey,
    ))).toBe(true);
    expect(scenario.tags).toContain('energy');
    expect(scenario.configuration.seed).toBe(42002);
  });

  it('replays the same fingerprint from the same seed', () => {
    expect(fingerprint()).toBe(fingerprint());
  });

  it('returns independent scenarios on each call', () => {
    const first = energyScenario();
    const second = energyScenario();
    first.variables[0]!.initial = 999;
    expect(second.variables[0]!.initial).toBe(100);
    expect(second).not.toBe(first);
  });
});
