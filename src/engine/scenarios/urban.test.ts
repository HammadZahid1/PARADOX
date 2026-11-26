import { describe, expect, it } from 'vitest';
import { applyRules } from '@/engine/core/rules';
import type { ScalarValue, Scenario, WorldState } from '@/engine/types';
import { urbanScenario } from './urban';

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

describe('urban scenario', () => {
  it('defines the seven urban variables', () => {
    const scenario = urbanScenario();
    expect(scenario.variables.map((variable) => variable.key)).toEqual([
      'population', 'housing', 'infrastructure', 'transportation', 'employment', 'energy', 'environmentQuality',
    ]);
  });

  it('models housing pressure, housing investment and employment attraction', () => {
    const scenario = urbanScenario();
    const result = applyRules(
      stateFor(scenario, {
        population: 120,
        housing: 80,
        infrastructure: 75,
        transportation: 65,
        employment: 70,
        energy: 75,
        environmentQuality: 70,
      }),
      scenario.rules,
      scenario.variables,
    );

    expect(result.applied).toEqual(expect.arrayContaining([
      'urban.rule.housingPressure',
      'urban.rule.housingInvestment',
      'urban.rule.infrastructureTransit',
      'urban.rule.employmentAttraction',
      'urban.rule.energyDemand',
    ]));
    expect(result.state.variables['urban.housing']).toBeCloseTo(80.5);
    expect(result.state.variables['urban.environmentQuality']).toBeCloseTo(69.5);
    expect(result.state.variables['urban.energy']).toBeCloseTo(72.5);
    expect(result.state.variables['urban.transportation']).toBeCloseTo(66.2);
    expect(result.state.variables['urban.population']).toBeCloseTo(121.2);
  });

  it('provides zoning, transit and energy-shock events', () => {
    const scenario = urbanScenario();
    const zoning = scenario.events.find((event) => event.id === 'urban.event.zoningReform');
    const transit = scenario.events.find((event) => event.id === 'urban.event.transitExpansion');
    const shock = scenario.events.find((event) => event.id === 'urban.event.energyShock');

    expect(zoning?.trigger).toEqual({ kind: 'scheduled', atStep: 12 });
    expect(zoning?.durationSteps).toBe(8);
    expect(transit?.trigger).toEqual({ kind: 'threshold', variableKey: 'transportation', operator: 'lte', value: 60 });
    expect(transit?.effects).toContainEqual({ kind: 'increase', variableKey: 'transportation', amount: 12 });
    expect(shock?.trigger).toEqual({ kind: 'threshold', variableKey: 'energy', operator: 'lte', value: 65 });
    expect(shock?.durationSteps).toBe(5);
  });
});
