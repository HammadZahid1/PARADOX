import { describe, expect, it } from 'vitest';
import type { CausalGraph, EventRecord, VariableDefinition, WorldState } from '@/engine/types';
import { addRelationship, addVariableNode, createCausalGraph } from './graph';
import { analyzeEventImpact, explainRelation } from './analysis';

const definitions: VariableDefinition[] = [
  { id: 'v1', key: 'resources', name: 'Resources', type: 'number', initial: 100 },
  { id: 'v2', key: 'stability', name: 'Stability', type: 'number', initial: 80 },
];
const base: WorldState = {
  id: 's', step: 1, time: 1, seed: 1, version: 1,
  variables: { v1: 100, v2: 80 }, parameters: {}, activeEvents: [], eventHistory: [], metrics: {}, changes: [],
};
const graph: CausalGraph = createCausalGraph('impact');
const node1 = addVariableNode(graph, definitions[0]!);
const node2 = addVariableNode(graph, definitions[1]!);
addRelationship(graph, node1.id, node2.id, { strength: 0.5 });
const record: EventRecord = {
  id: 'r', eventId: 'e1', eventName: 'Shock', step: 1, time: 1, severity: 'warning',
  source: 'manual', affectedVariables: ['resources'],
};

describe('causal impact analysis', () => {
  it('traces direct, indirect and changed variables', () => {
    const analysis = analyzeEventImpact({
      eventId: 'e1', graph, before: base,
      after: { ...base, variables: { v1: 80, v2: 75 } },
      definitions, history: [record],
      propagationSteps: [
        { edgeId: graph.edges[0]!.id, fromNode: node1.id, toNode: node2.id, depth: 1, relation: 'influences', strength: 0.5 },
      ],
    });
    expect(analysis.direct).toHaveLength(1);
    expect(analysis.affectedVariables).toEqual(expect.arrayContaining(['resources', 'stability']));
    expect(analysis.maxDepth).toBe(1);
    expect(analysis.assumptions.length).toBeGreaterThan(0);
  });

  it('explains relation semantics', () => {
    expect(explainRelation('correlates-with', 0.3)).toContain('correlates with');
    expect(explainRelation('reduces', -0.5)).toContain('inverse');
  });
});
