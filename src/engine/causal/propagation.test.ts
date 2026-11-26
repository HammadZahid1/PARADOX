import { describe, expect, it } from 'vitest';
import type { VariableDefinition, WorldState } from '@/engine/types';
import { addRelationship, createCausalGraph, addVariableNode } from './graph';
import { applyPendingPropagations, propagateChange } from './propagation';

const definitions: VariableDefinition[] = [
  { id: 'v1', key: 'supply', name: 'Supply', type: 'number', initial: 100 },
  { id: 'v2', key: 'price', name: 'Price', type: 'number', initial: 50, min: 0, max: 200 },
  { id: 'v3', key: 'demand', name: 'Demand', type: 'number', initial: 50, min: 0, max: 200 },
];
const state: WorldState = {
  id: 's', step: 2, time: 2, seed: 1, version: 1,
  variables: { v1: 100, v2: 50, v3: 50 }, parameters: {}, activeEvents: [], eventHistory: [], metrics: {}, changes: [],
};

function chain() {
  const graph = createCausalGraph('chain');
  const supply = addVariableNode(graph, definitions[0]!);
  const price = addVariableNode(graph, definitions[1]!);
  const demand = addVariableNode(graph, definitions[2]!);
  addRelationship(graph, supply.id, price.id, { type: 'influences', strength: -0.5 });
  addRelationship(graph, price.id, demand.id, { type: 'influences', strength: -0.4 });
  return { graph, supply, price, demand };
}

describe('causal propagation', () => {
  it('propagates signed effects through a chain', () => {
    const { graph } = chain();
    const result = propagateChange(graph, state, 'supply', -10, definitions);
    expect(result.state.variables.v2).toBe(55);
    expect(result.state.variables.v3).toBe(48);
    expect(result.steps).toHaveLength(2);
    expect(result.steps[0]?.depth).toBe(1);
    expect(result.steps[1]?.depth).toBe(2);
  });

  it('does not treat correlation as causation', () => {
    const { graph, supply, price } = chain();
    graph.edges = [{ ...graph.edges[0]!, id: 'corr', type: 'correlates-with', strength: 1 }];
    expect(propagateChange(graph, state, 'supply', -10, definitions).state.variables.v2).toBe(50);
    expect(supply.id).not.toBe(price.id);
  });

  it('limits feedback cycles and respects edge conditions', () => {
    const { graph, supply, price } = chain();
    addRelationship(graph, price.id, supply.id, { type: 'influences', strength: 0.5 });
    const result = propagateChange(graph, state, 'supply', -10, definitions, 2);
    expect(result.cycleArrested).toBe(true);
    const conditional = { ...graph, edges: [{ ...graph.edges[0]!, condition: { id: 'c', variableKey: 'supply', operator: 'gt' as const, value: 500 } }] };
    expect(propagateChange(conditional, state, 'supply', -10, definitions).steps).toHaveLength(0);
  });

  it('defers delayed relationships and applies them later', () => {
    const graph = createCausalGraph('delayed');
    const supply = addVariableNode(graph, definitions[0]!);
    const price = addVariableNode(graph, definitions[1]!);
    addRelationship(graph, supply.id, price.id, { strength: 0.5, delaySteps: 3 });
    const result = propagateChange(graph, state, 'supply', 10, definitions);
    expect(result.state.variables.v2).toBe(50);
    expect(result.pending).toHaveLength(1);
    const applied = applyPendingPropagations(result.state, result.pending, 5, graph, definitions);
    expect(applied.state.variables.v2).toBe(55);
  });
});
