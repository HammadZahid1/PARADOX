import { describe, expect, it } from 'vitest';
import type { SimulationRule, VariableDefinition, WorldState } from '@/engine/types';
import { applyRules, ruleCoverage } from './rules';

const definitions: VariableDefinition[] = [
  { id: 'v1', key: 'supply', name: 'Supply', type: 'number', initial: 100 },
  { id: 'v2', key: 'demand', name: 'Demand', type: 'number', initial: 80 },
];

const rules: SimulationRule[] = [
  {
    id: 'r1', name: 'Consumption', priority: 1, enabled: true,
    effects: [{ kind: 'decrease', variableKey: 'supply', amount: 5 }],
  },
  {
    id: 'r2', name: 'Restock when low', priority: 2, enabled: true,
    condition: { id: 'c1', variableKey: 'supply', operator: 'lt', value: 50 },
    effects: [{ kind: 'increase', variableKey: 'supply', amount: 20 }],
  },
];

const state: WorldState = {
  id: 's', step: 0, time: 0, seed: 1, version: 1,
  variables: { v1: 100, v2: 80 }, parameters: {}, activeEvents: [], eventHistory: [], metrics: {}, changes: [],
};

describe('simulation rules', () => {
  it('applies enabled rules and skips unmet conditions', () => {
    const result = applyRules(state, rules, definitions);
    expect(result.state.variables.v1).toBe(95);
    expect(result.applied).toContain('r1');
    expect(result.skipped).toContain('r2');
    expect(result.changes).toHaveLength(1);
  });

  it('respects priority ordering', () => {
    const low = { ...state, variables: { v1: 40, v2: 80 } };
    expect(applyRules(low, rules, definitions).state.variables.v1).toBe(55);
  });

  it('ignores disabled rules and unknown variables', () => {
    const disabled = rules.map((rule) => ({ ...rule, enabled: false }));
    expect(applyRules(state, disabled, definitions).state.variables.v1).toBe(100);
    const broken = [{ ...rules[0]!, effects: [{ kind: 'increase' as const, variableKey: 'unknown', amount: 5 }] }];
    expect(applyRules(state, broken, definitions).changes).toHaveLength(0);
  });

  it('calculates rule coverage', () => {
    expect(ruleCoverage(rules, definitions)).toBe(0.5);
  });
});
