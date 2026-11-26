import { describe, expect, it } from 'vitest';
import { applyRules } from '@/engine/core/rules';
import type { ScalarValue, Scenario, WorldState } from '@/engine/types';
import { technologyScenario } from './technology';

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

describe('technology scenario', () => {
  it('defines the innovation-to-productivity variable chain', () => {
    const scenario = technologyScenario();
    expect(scenario.variables.map((variable) => variable.key)).toEqual([
      'innovation', 'research', 'compute', 'adoption', 'productivity', 'infrastructure', 'competition',
    ]);
  });

  it('feeds productive gains back into research and infrastructure', () => {
    const scenario = technologyScenario();
    const result = applyRules(
      stateFor(scenario, {
        innovation: 50,
        research: 70,
        compute: 75,
        adoption: 65,
        productivity: 80,
        infrastructure: 70,
        competition: 70,
      }),
      scenario.rules,
      scenario.variables,
    );

    expect(result.applied).toEqual(expect.arrayContaining([
      'technology.rule.researchInnovation',
      'technology.rule.computeResearch',
      'technology.rule.competitionInnovation',
      'technology.rule.infraCompute',
      'technology.rule.infraAdoption',
      'technology.rule.adoptionProductivity',
      'technology.rule.productivityFunding',
    ]));
    expect(result.state.variables['technology.innovation']).toBe(53);
    expect(result.state.variables['technology.research']).toBe(72);
    expect(result.state.variables['technology.compute']).toBeCloseTo(76.5);
    expect(result.state.variables['technology.adoption']).toBe(66);
    expect(result.state.variables['technology.productivity']).toBeCloseTo(81.2);
    expect(result.state.variables['technology.infrastructure']).toBeCloseTo(70.5);
    expect(result.state.variables['technology.competition']).toBeCloseTo(69.7);
  });

  it('uses a breakthrough, regulation and infrastructure investment event set', () => {
    const scenario = technologyScenario();
    const breakthrough = scenario.events.find((event) => event.id === 'technology.event.breakthrough');
    const regulation = scenario.events.find((event) => event.id === 'technology.event.regulation');
    const investment = scenario.events.find((event) => event.id === 'technology.event.infrastructureInvestment');

    expect(breakthrough?.trigger).toEqual({ kind: 'scheduled', atStep: 14 });
    expect(breakthrough?.outcomes?.map((outcome) => outcome.probability)).toEqual([0.6, 0.4]);
    expect(breakthrough?.outcomes?.[1]?.effects).toContainEqual({ kind: 'multiply', variableKey: 'research', factor: 1.2 });
    expect(regulation?.trigger).toEqual({ kind: 'threshold', variableKey: 'innovation', operator: 'gte', value: 75 });
    expect(investment?.effects).toContainEqual({ kind: 'percentChange', variableKey: 'research', percent: 5 });
    expect(investment?.cooldownSteps).toBe(20);
  });
});
