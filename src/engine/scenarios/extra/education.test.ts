import { describe, expect, it } from 'vitest';
import { stateFingerprint } from '@/engine/core/state';
import { SimulationEngine } from '@/engine/simulation/engine';
import { validateScenario } from '@/engine/validation';
import { educationScenario } from './education';

function fingerprint(): string {
  const engine = new SimulationEngine(educationScenario());
  engine.run(8);
  return stateFingerprint(engine.activeBranch.currentState);
}

describe('extra education preset', () => {
  it('is a valid, fully populated fictional district scenario', () => {
    const scenario = educationScenario();
    const result = validateScenario(scenario);
    expect(result.valid, result.issues.map((issue) => issue.message).join(', ')).toBe(true);
    expect(result.issues).toEqual([]);
    expect(scenario.id).toBe('extra-education');
    expect(scenario.domain).toBe('education');
    expect(scenario.preset).toBe(true);
    expect(scenario.disclaimer).toBeTruthy();
    expect(scenario.variables.map((variable) => variable.key)).toEqual(expect.arrayContaining([
      'enrollment', 'teacherCoverage', 'funding', 'attendance', 'literacy', 'learningIndex',
    ]));
    expect(scenario.rules.length).toBeGreaterThan(0);
    expect(scenario.events.length).toBeGreaterThan(0);
    expect(scenario.objectives.every((objective) => scenario.variables.some(
      (variable) => variable.key === objective.variableKey,
    ))).toBe(true);
    expect(scenario.tags).toContain('education');
  });

  it('replays the same fingerprint from the same seed', () => {
    expect(fingerprint()).toBe(fingerprint());
  });

  it('returns independent scenarios on each call', () => {
    const first = educationScenario();
    const second = educationScenario();
    first.variables[0]!.initial = 999;
    expect(second.variables[0]!.initial).toBe(100);
    expect(second).not.toBe(first);
  });
});
