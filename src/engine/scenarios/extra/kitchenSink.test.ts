import { describe, expect, it } from 'vitest';
import { stateFingerprint } from '@/engine/core/state';
import { SimulationEngine } from '@/engine/simulation/engine';
import { validateScenario } from '@/engine/validation';
import { kitchenSinkScenario } from './kitchenSink';

function fingerprint(): string {
  const engine = new SimulationEngine(kitchenSinkScenario());
  engine.run(8);
  return stateFingerprint(engine.activeBranch.currentState);
}

describe('extra kitchen-sink preset', () => {
  it('is a valid, fully populated scenario', () => {
    const scenario = kitchenSinkScenario();
    const result = validateScenario(scenario);
    expect(result.valid, result.issues.map((issue) => issue.message).join(', ')).toBe(true);
    expect(result.issues).toEqual([]);
    expect(scenario.id).toBe('extra-kitchen-sink');
    expect(scenario.domain).toBe('kitchen-sink');
    expect(scenario.preset).toBe(true);
    expect(scenario.disclaimer).toBeTruthy();
    expect(scenario.objectives.every((objective) => scenario.variables.some(
      (variable) => variable.key === objective.variableKey,
    ))).toBe(true);
    expect(scenario.tags).toEqual(expect.arrayContaining(['kitchen-sink', 'coverage']));
  });

  it('covers every supported variable type, trigger kind and event effect kind', () => {
    const scenario = kitchenSinkScenario();
    const variableTypes = [...new Set(scenario.variables.map((variable) => variable.type))].sort();
    expect(variableTypes).toEqual(['boolean', 'categorical', 'derived', 'number']);

    const triggerKinds = [...new Set(scenario.events.map((event) => event.trigger.kind))].sort();
    expect(triggerKinds).toEqual([
      'boolean', 'cascade', 'dependency', 'manual', 'probability', 'recurring', 'scheduled', 'threshold',
    ]);

    const effectKinds = new Set<string>();
    for (const event of scenario.events) {
      for (const effect of event.effects) effectKinds.add(effect.kind);
      for (const outcome of event.outcomes ?? []) {
        for (const effect of outcome.effects) effectKinds.add(effect.kind);
      }
    }
    expect([...effectKinds].sort()).toEqual([
      'assign', 'conditional', 'decrease', 'increase', 'log', 'multiply', 'percentChange', 'temporary',
    ]);

    const manual = scenario.events.find((event) => event.trigger.kind === 'manual');
    expect(manual?.type).toBe('manual');
    expect(scenario.events.every((event) => event.probability >= 0 && event.probability <= 1)).toBe(true);
  });

  it('replays the same fingerprint from the same seed', () => {
    expect(fingerprint()).toBe(fingerprint());
  });

  it('returns independent scenarios on each call', () => {
    const first = kitchenSinkScenario();
    const second = kitchenSinkScenario();
    first.variables[0]!.initial = 999;
    expect(second.variables[0]!.initial).toBe(20);
    expect(second).not.toBe(first);
  });
});
