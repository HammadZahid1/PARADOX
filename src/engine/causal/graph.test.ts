import { describe, expect, it } from 'vitest';
import type { SimulationEvent, VariableDefinition } from '@/engine/types';
import { addEventNode, addRelationship, addVariableNode, buildGraphFromDefinitions, causalOrder, createCausalGraph, graphPath, removeRelationship } from './graph';

const definitions: VariableDefinition[] = [
  { id: 'v1', key: 'resources', name: 'Resources', type: 'number', initial: 10 },
  { id: 'v2', key: 'stability', name: 'Stability', type: 'number', initial: 10 },
];
const events: SimulationEvent[] = [{
  id: 'e1', name: 'Shortage', type: 'manual', trigger: { kind: 'manual' }, probability: 1,
  conditions: [], effects: [{ kind: 'decrease', variableKey: 'resources', amount: 2 }],
  dependencies: [], priority: 1, severity: 'warning', enabled: true,
}];

describe('causal graph construction', () => {
  it('creates nodes, edges and removes edges', () => {
    const graph = createCausalGraph('test');
    const a = addVariableNode(graph, definitions[0]!);
    const b = addVariableNode(graph, definitions[1]!);
    const edge = addRelationship(graph, a.id, b.id, { strength: 0.7 });
    expect(graph.nodes).toHaveLength(2);
    expect(graph.edges).toHaveLength(1);
    expect(edge.strength).toBe(0.7);
    expect(removeRelationship(graph, edge.id).edges).toHaveLength(0);
    expect(addVariableNode(graph, definitions[0]!).id).toBe(a.id);
  });

  it('finds paths and causal order', () => {
    const graph = createCausalGraph('test');
    const a = addVariableNode(graph, definitions[0]!);
    const b = addVariableNode(graph, definitions[1]!);
    addRelationship(graph, a.id, b.id);
    expect(graphPath(graph, a.id, b.id)).toEqual([a.id, b.id]);
    expect(causalOrder(graph)).toEqual([a.id, b.id]);
  });

  it('derives event-to-variable relationships without inventing correlations', () => {
    const graph = buildGraphFromDefinitions('derived', definitions, events);
    expect(graph.nodes).toHaveLength(3);
    expect(graph.edges).toHaveLength(1);
    expect(graph.edges[0]?.type).toBe('causes');
    expect(addEventNode(graph, events[0]!).id).toBe(graph.nodes[2]?.id);
  });
});
