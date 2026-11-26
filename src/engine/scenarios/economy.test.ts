import { describe, expect, it } from 'vitest';
import { applyRules } from '@/engine/core/rules';
import { recomputeDerived } from '@/engine/core/variables';
import type { ScalarValue, Scenario, WorldState } from '@/engine/types';
import { economyScenario } from './economy';

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

describe('economy scenario', () => {
  it('defines every requested variable and a computable derived growth rate', () => {
    const scenario = economyScenario();
    const keys = scenario.variables.map((variable) => variable.key);
    expect(keys).toEqual(expect.arrayContaining([
      'inflation', 'interestRate', 'unemployment', 'consumerDemand', 'production',
      'supply', 'publicDebt', 'investment', 'growth',
    ]));

    const growth = scenario.variables.find((variable) => variable.key === 'growth');
    expect(growth?.type).toBe('derived');
    expect(growth?.derivedFrom).toEqual(['production', 'supply']);

    const state = stateFor(scenario, { production: 112, supply: 100 });
    const recomputed = recomputeDerived(state, scenario.variables);
    expect(recomputed.state.variables['economy.growth']).toBe(12);
  });

  it('encodes demand, supply, debt and monetary feedback rules', () => {
    const scenario = economyScenario();
    const squeezed = applyRules(
      stateFor(scenario, {
        consumerDemand: 115,
        production: 100,
        supply: 90,
        publicDebt: 120,
        investment: 55,
      }),
      scenario.rules,
      scenario.variables,
    );

    expect(squeezed.applied).toContain('economy.rule.demandSqueeze');
    expect(squeezed.applied).toContain('economy.rule.supplyShortfall');
    expect(squeezed.applied).toContain('economy.rule.deficitFinancing');
    expect(squeezed.state.variables['economy.inflation']).toBeCloseTo(4.4);
    expect(squeezed.state.variables['economy.publicDebt']).toBe(122);

    const tight = applyRules(
      stateFor(scenario, { interestRate: 7, investment: 55, consumerDemand: 100 }),
      scenario.rules,
      scenario.variables,
    );
    expect(tight.state.variables['economy.investment']).toBeCloseTo(53.5);
    expect(tight.state.variables['economy.consumerDemand']).toBeCloseTo(99.2);
  });

  it('provides deterministic shocks and conditional policy events with numeric effects', () => {
    const scenario = economyScenario();
    const shock = scenario.events.find((event) => event.id === 'economy.event.marketShock');
    const policy = scenario.events.find((event) => event.id === 'economy.event.policyRateChange');
    const disruption = scenario.events.find((event) => event.id === 'economy.event.supplyDisruption');

    expect(shock?.trigger).toEqual({ kind: 'scheduled', atStep: 12 });
    expect(shock?.outcomes?.reduce((sum, outcome) => sum + outcome.probability, 0)).toBeCloseTo(1);
    expect(shock?.outcomes?.some((outcome) => outcome.effects.some(
      (effect) => effect.kind === 'multiply' && effect.factor === 0.85,
    ))).toBe(true);

    expect(policy?.trigger).toEqual({ kind: 'threshold', variableKey: 'inflation', operator: 'gte', value: 7 });
    expect(policy?.cooldownSteps).toBe(30);
    expect(policy?.effects).toContainEqual({ kind: 'assign', variableKey: 'interestRate', value: 6.5 });
    expect(policy?.effects).toContainEqual({ kind: 'percentChange', variableKey: 'investment', percent: -10 });

    expect(disruption?.durationSteps).toBe(5);
    expect(disruption?.effects.some((effect) => effect.kind === 'decrease' && effect.amount === 12)).toBe(true);
    expect(scenario.events.every((event) => event.probability >= 0 && event.probability <= 1)).toBe(true);
  });

  it('returns a fresh scenario on each call', () => {
    const first = economyScenario();
    const second = economyScenario();
    first.variables[0]!.initial = 999;
    expect(second.variables[0]!.initial).toBe(2.4);
  });
});
