import { describe, expect, it } from 'vitest';
import { applyRules } from '@/engine/core/rules';
import type { ScalarValue, Scenario, WorldState } from '@/engine/types';
import { geopoliticsScenario } from './geopolitics';

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

describe('geopolitics scenario', () => {
  it('uses only the fictional regions and abstract indices', () => {
    const scenario = geopoliticsScenario();
    expect(scenario.variables.map((variable) => variable.key)).toEqual([
      'cooperation', 'tension', 'trade', 'security', 'resources', 'publicSentiment',
    ]);
    expect(scenario.parameters.regions).toBe('Aurora League | Meridian Compact | Sable Coast');
    expect(scenario.description).toContain('Aurora League');
    expect(scenario.disclaimer).toContain('not a predictor');
  });

  it('encodes trade, tension, scarcity and sentiment interactions', () => {
    const scenario = geopoliticsScenario();
    const result = applyRules(
      stateFor(scenario, {
        cooperation: 75,
        tension: 70,
        trade: 85,
        security: 80,
        resources: 45,
        publicSentiment: 72,
      }),
      scenario.rules,
      scenario.variables,
    );

    expect(result.applied).toEqual(expect.arrayContaining([
      'geopolitics.rule.tradeCooperation',
      'geopolitics.rule.tensionErodesTrade',
      'geopolitics.rule.securityDilemma',
      'geopolitics.rule.resourceScarcity',
      'geopolitics.rule.cooperationTrade',
      'geopolitics.rule.sentimentDampens',
      'geopolitics.rule.tensionSentiment',
    ]));
    expect(result.state.variables['geopolitics.cooperation']).toBeCloseTo(74.5);
    expect(result.state.variables['geopolitics.tension']).toBeCloseTo(71.5);
    expect(result.state.variables['geopolitics.trade']).toBeCloseTo(84.2);
    expect(result.state.variables['geopolitics.security']).toBeCloseTo(79.2);
    expect(result.state.variables['geopolitics.resources']).toBeCloseTo(45.8);
    expect(result.state.variables['geopolitics.publicSentiment']).toBeCloseTo(71.5);
  });

  it('provides summit, border incident and embargo events', () => {
    const scenario = geopoliticsScenario();
    const summit = scenario.events.find((event) => event.id === 'geopolitics.event.summit');
    const incident = scenario.events.find((event) => event.id === 'geopolitics.event.borderIncident');
    const embargo = scenario.events.find((event) => event.id === 'geopolitics.event.tradeEmbargo');

    expect(summit?.trigger).toEqual({ kind: 'scheduled', atStep: 10 });
    expect(summit?.description).toContain('Meridian Compact');
    expect(incident?.trigger).toEqual({ kind: 'threshold', variableKey: 'tension', operator: 'gte', value: 70 });
    expect(incident?.cooldownSteps).toBe(20);
    expect(embargo?.trigger).toEqual({ kind: 'threshold', variableKey: 'trade', operator: 'lte', value: 50 });
    expect(embargo?.effects).toContainEqual({ kind: 'percentChange', variableKey: 'security', percent: -8 });
  });
});
