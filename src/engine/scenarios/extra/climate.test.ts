import { describe, expect, it } from 'vitest';
import { stateFingerprint } from '@/engine/core/state';
import { SimulationEngine } from '@/engine/simulation/engine';
import { validateScenario } from '@/engine/validation';
import { climateScenario } from './climate';

function fingerprint(): string {
  const engine = new SimulationEngine(climateScenario());
  engine.run(8);
  return stateFingerprint(engine.activeBranch.currentState);
}

describe('extra climate preset', () => {
  it('is a valid, fully populated fictional scenario', () => {
    const scenario = climateScenario();
    const result = validateScenario(scenario);
    expect(result.valid, result.issues.map((issue) => issue.message).join(', ')).toBe(true);
    expect(result.issues).toEqual([]);
    expect(scenario.id).toBe('extra-climate');
    expect(scenario.domain).toBe('climate-education');
    expect(scenario.preset).toBe(true);
    expect(scenario.variables.map((variable) => variable.key)).toEqual(expect.arrayContaining([
      'atmosphericCO2', 'meanTemperature', 'emissions', 'adaptation', 'warmingIndex',
    ]));
    expect(scenario.rules.length).toBeGreaterThan(0);
    expect(scenario.events.length).toBeGreaterThan(0);
    expect(scenario.objectives.every((objective) => scenario.variables.some(
      (variable) => variable.key === objective.variableKey,
    ))).toBe(true);
    expect(scenario.tags).toEqual(expect.arrayContaining(['climate', 'educational-model']));
  });

  it('explicitly labels itself as a simplified educational model, not a predictor', () => {
    const scenario = climateScenario();
    expect(`${scenario.name} ${scenario.description}`).toMatch(/simplified educational model/i);
    expect(scenario.disclaimer).toMatch(/not a climate predictor/i);
    expect(scenario.disclaimer).toMatch(/simplified educational model/i);
  });

  it('replays the same fingerprint from the same seed', () => {
    expect(fingerprint()).toBe(fingerprint());
  });

  it('returns independent scenarios on each call', () => {
    const first = climateScenario();
    const second = climateScenario();
    first.variables[0]!.initial = 999;
    expect(second.variables[0]!.initial).toBe(420);
    expect(second).not.toBe(first);
  });
});
