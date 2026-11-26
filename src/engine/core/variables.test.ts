import { describe, expect, it } from 'vitest';
import type { VariableDefinition, WorldState } from '@/engine/types';
import { applyEventEffect, definitionsByKey, diffVariables, evaluateCondition, recomputeDerived, setVariable } from './variables';

const definitions: VariableDefinition[] = [
  { id: 'v1', key: 'resources', name: 'Resources', type: 'number', initial: 100, min: 0, max: 200 },
  { id: 'v2', key: 'active', name: 'Active', type: 'boolean', initial: false },
  { id: 'v3', key: 'mode', name: 'Mode', type: 'categorical', initial: 'stable', constraints: { allowed: ['stable', 'crisis'] } },
  { id: 'v4', key: 'net', name: 'Net', type: 'derived', initial: 0, expression: 'resources - 20', derivedFrom: ['resources'] },
];

const state: WorldState = {
  id: 's', time: 0, step: 0,
  variables: Object.fromEntries(definitions.map((d) => [d.id, d.initial])),
  parameters: {}, activeEvents: [], eventHistory: [], metrics: {}, seed: 1, version: 1, changes: [],
};

describe('variable operations', () => {
  it('maps variables by key and evaluates conditions', () => {
    expect(definitionsByKey(definitions).get('resources')?.id).toBe('v1');
    expect(evaluateCondition({ id: 'c', variableKey: 'resources', operator: 'gt', value: 50 }, state, definitions)).toBe(true);
    expect(evaluateCondition({ id: 'c', variableKey: 'active', operator: 'eq', value: false }, state, definitions)).toBe(true);
    expect(evaluateCondition({ id: 'c', variableKey: 'mode', operator: 'contains', value: 'stab' }, state, definitions)).toBe(true);
  });

  it('clamps numeric variables and records changes', () => {
    const result = setVariable(state, definitions[0]!, 500, 'test');
    expect(result.state.variables.v1).toBe(200);
    expect(result.change?.from).toBe(100);
    expect(state.variables.v1).toBe(100);
  });

  it('applies arithmetic and conditional event effects', () => {
    const decreased = applyEventEffect(state, { kind: 'decrease', variableKey: 'resources', amount: 25 }, definitions, 'shock');
    expect(decreased.state.variables.v1).toBe(75);
    const conditional = applyEventEffect(state, { kind: 'conditional', condition: { id: 'c', variableKey: 'active', operator: 'eq', value: false }, then: { kind: 'assign', variableKey: 'active', value: true } }, definitions, 'test');
    expect(conditional.state.variables.v2).toBe(true);
  });

  it('recomputes derived variables and diffs states', () => {
    const recalculated = recomputeDerived(state, definitions);
    expect(recalculated.state.variables.v4).toBe(80);
    expect(recalculated.changes).toHaveLength(1);
    expect(diffVariables(state, recalculated.state, definitions)).toHaveLength(1);
  });
});
