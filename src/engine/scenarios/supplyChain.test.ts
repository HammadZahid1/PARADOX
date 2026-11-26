import { describe, expect, it } from 'vitest';
import { applyRules } from '@/engine/core/rules';
import type { ScalarValue, Scenario, WorldState } from '@/engine/types';
import { supplyChainScenario } from './supplyChain';

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

describe('supply chain scenario', () => {
  it('defines the six supply-chain variables', () => {
    const scenario = supplyChainScenario();
    expect(scenario.variables.map((variable) => variable.key)).toEqual([
      'production', 'inventory', 'demand', 'transportCapacity', 'deliveryTime', 'supplierReliability',
    ]);
  });

  it('depletes inventory under high demand and restocks it from production', () => {
    const scenario = supplyChainScenario();
    const result = applyRules(
      stateFor(scenario, {
        production: 105,
        inventory: 90,
        demand: 120,
        transportCapacity: 80,
        deliveryTime: 5,
        supplierReliability: 80,
      }),
      scenario.rules,
      scenario.variables,
    );

    expect(result.applied).toEqual(expect.arrayContaining([
      'supplyChain.rule.demandDepletion',
      'supplyChain.rule.productionRestock',
      'supplyChain.rule.transportImprovement',
      'supplyChain.rule.demandDelay',
    ]));
    expect(result.state.variables['supplyChain.inventory']).toBe(89);
    expect(result.state.variables['supplyChain.deliveryTime']).toBeCloseTo(5.1);
    expect(result.state.variables['supplyChain.supplierReliability']).toBeCloseTo(79.6);
  });

  it('penalises unreliable suppliers and has the requested disruption events', () => {
    const scenario = supplyChainScenario();
    const unreliable = applyRules(
      stateFor(scenario, { supplierReliability: 60, deliveryTime: 5, transportCapacity: 80 }),
      scenario.rules,
      scenario.variables,
    );
    expect(unreliable.state.variables['supplyChain.production']).toBeCloseTo(98.5);
    expect(unreliable.state.variables['supplyChain.deliveryTime']).toBeCloseTo(4.9);

    const failure = scenario.events.find((event) => event.id === 'supplyChain.event.supplierFailure');
    const surge = scenario.events.find((event) => event.id === 'supplyChain.event.demandSurge');
    const congestion = scenario.events.find((event) => event.id === 'supplyChain.event.portCongestion');

    expect(failure?.trigger).toEqual({ kind: 'scheduled', atStep: 16 });
    expect(failure?.effects).toContainEqual({ kind: 'multiply', variableKey: 'supplierReliability', factor: 0.8 });
    expect(surge?.trigger).toEqual({ kind: 'threshold', variableKey: 'demand', operator: 'gte', value: 115 });
    expect(surge?.effects).toContainEqual({ kind: 'percentChange', variableKey: 'production', percent: 5 });
    expect(congestion?.trigger).toEqual({ kind: 'threshold', variableKey: 'transportCapacity', operator: 'lte', value: 60 });
    expect(congestion?.durationSteps).toBe(6);
  });
});
