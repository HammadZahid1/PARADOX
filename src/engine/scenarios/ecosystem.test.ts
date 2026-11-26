import { describe, expect, it } from 'vitest';
import { applyRules } from '@/engine/core/rules';
import type { ScalarValue, Scenario, WorldState } from '@/engine/types';
import { ecosystemScenario } from './ecosystem';

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

describe('ecosystem scenario', () => {
  it('defines all climate and ecosystem variables', () => {
    const scenario = ecosystemScenario();
    expect(scenario.variables.map((variable) => variable.key)).toEqual([
      'temperature', 'precipitation', 'biodiversity', 'carbon', 'vegetation', 'ocean', 'ecosystemStability',
    ]);
    expect(scenario.disclaimer).toMatch(/simplified educational model/i);
  });

  it('applies carbon-temperature and vegetation-carbon feedback rules', () => {
    const scenario = ecosystemScenario();
    const result = applyRules(
      stateFor(scenario, {
        temperature: 17,
        precipitation: 100,
        biodiversity: 75,
        carbon: 140,
        vegetation: 70,
        ocean: 60,
        ecosystemStability: 70,
      }),
      scenario.rules,
      scenario.variables,
    );

    expect(result.applied).toEqual(expect.arrayContaining([
      'ecosystem.rule.carbonWarming',
      'ecosystem.rule.warmingCarbon',
      'ecosystem.rule.carbonAbsorption',
      'ecosystem.rule.heatStress',
      'ecosystem.rule.oceanAbsorption',
      'ecosystem.rule.stabilityErosion',
      'ecosystem.rule.stabilitySupport',
    ]));
    expect(result.state.variables['ecosystem.temperature']).toBeCloseTo(17.4);
    expect(result.state.variables['ecosystem.carbon']).toBeCloseTo(138.4);
    expect(result.state.variables['ecosystem.vegetation']).toBeCloseTo(68.8);
    expect(result.state.variables['ecosystem.biodiversity']).toBeCloseTo(74.2);
    expect(result.state.variables['ecosystem.ocean']).toBeCloseTo(60.5);
    expect(result.state.variables['ecosystem.ecosystemStability']).toBeCloseTo(69.6);
  });

  it('includes the three scenario events with valid triggers and effects', () => {
    const scenario = ecosystemScenario();
    const volcanic = scenario.events.find((event) => event.id === 'ecosystem.event.volcanicWinter');
    const conservation = scenario.events.find((event) => event.id === 'ecosystem.event.conservationPolicy');
    const heatwave = scenario.events.find((event) => event.id === 'ecosystem.event.heatwave');

    expect(volcanic?.trigger).toEqual({ kind: 'scheduled', atStep: 20 });
    expect(volcanic?.effects).toContainEqual({ kind: 'percentChange', variableKey: 'biodiversity', percent: -6 });
    expect(conservation?.trigger).toEqual({ kind: 'threshold', variableKey: 'biodiversity', operator: 'lte', value: 60 });
    expect(conservation?.effects).toContainEqual({ kind: 'multiply', variableKey: 'carbon', factor: 0.95 });
    expect(heatwave?.trigger).toEqual({ kind: 'threshold', variableKey: 'temperature', operator: 'gte', value: 16.5 });
    expect(heatwave?.durationSteps).toBe(4);
    expect(scenario.events.every((event) => event.probability >= 0 && event.probability <= 1)).toBe(true);
  });
});
