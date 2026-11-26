import { describe, expect, it } from 'vitest';
import { applyRules } from '@/engine/core/rules';
import type { ScalarValue, Scenario, WorldState } from '@/engine/types';
import { civilizationScenario } from './civilization';

function stateFor(scenario: Scenario, values: Record<string, number>): WorldState {
  const variables: Record<string, ScalarValue> = {};
  for (const definition of scenario.variables) {
    variables[definition.id] = values[definition.key] ?? definition.initial;
  }
  return {
    id: scenario.worldId,
    step: 0,
    time: 0,
    seed: scenario.configuration.seed,
    version: 1,
    variables,
    parameters: {},
    activeEvents: [],
    eventHistory: [],
    metrics: {},
    changes: [],
  };
}

describe('civilization scenario', () => {
  it('defines the eight core civilisation variables', () => {
    const scenario = civilizationScenario();
    expect(scenario.variables.map((variable) => variable.key)).toEqual([
      'population', 'food', 'energy', 'technology', 'resources', 'stability', 'environment', 'infrastructure',
    ]);
    expect(scenario.variables.every((variable) => variable.min !== undefined && variable.max !== undefined)).toBe(true);
  });

  it('balances consumption, production, scarcity and technology investment', () => {
    const scenario = civilizationScenario();
    const result = applyRules(
      stateFor(scenario, {
        population: 120,
        food: 70,
        energy: 60,
        technology: 60,
        resources: 90,
        stability: 85,
        environment: 80,
        infrastructure: 70,
      }),
      scenario.rules,
      scenario.variables,
    );

    expect(result.applied).toEqual(expect.arrayContaining([
      'civilization.rule.consumption',
      'civilization.rule.agriculture',
      'civilization.rule.energyProduction',
      'civilization.rule.foodScarcity',
      'civilization.rule.energyScarcity',
      'civilization.rule.research',
      'civilization.rule.investment',
    ]));
    expect(result.state.variables['civilization.food']).toBe(70);
    expect(result.state.variables['civilization.population']).toBe(118);
    expect(result.state.variables['civilization.energy']).toBeCloseTo(62.5);
    expect(result.state.variables['civilization.stability']).toBe(78);
    expect(result.state.variables['civilization.technology']).toBe(62);
    expect(result.state.variables['civilization.infrastructure']).toBe(71);
    expect(result.state.variables['civilization.resources']).toBeCloseTo(84);
  });

  it('includes drought, discovery and migration events with bounded probabilities', () => {
    const scenario = civilizationScenario();
    const drought = scenario.events.find((event) => event.id === 'civilization.event.drought');
    const discovery = scenario.events.find((event) => event.id === 'civilization.event.discovery');
    const migration = scenario.events.find((event) => event.id === 'civilization.event.migration');

    expect(drought?.type).toBe('scheduled');
    expect(drought?.trigger).toEqual({ kind: 'scheduled', atStep: 15 });
    expect(drought?.durationSteps).toBe(4);
    expect(drought?.effects).toContainEqual({ kind: 'percentChange', variableKey: 'population', percent: -3 });

    expect(discovery?.trigger).toEqual({ kind: 'threshold', variableKey: 'technology', operator: 'gte', value: 70 });
    expect(migration?.trigger).toEqual({ kind: 'threshold', variableKey: 'food', operator: 'lte', value: 75 });
    expect(migration?.cooldownSteps).toBe(18);
    expect(scenario.events.every((event) => event.probability >= 0 && event.probability <= 1)).toBe(true);
    expect(scenario.disclaimer).toContain('Simplified educational model');
  });
});
