import { describe, expect, it } from 'vitest';
import type { CausalGraph } from '@/engine/types';
import { addRelationship, createCausalGraph } from '@/engine/causal/graph';
import { assignLayers } from './layers';

function fixture(): CausalGraph {
  const graph = createCausalGraph('layers');
  for (const id of ['A', 'B', 'C', 'D', 'E', 'F']) {
    graph.nodes.push({ id, kind: 'variable', refId: `v${id}`, label: id });
  }
  addRelationship(graph, 'A', 'B', { id: 'eAB' });
  addRelationship(graph, 'A', 'C', { id: 'eAC' });
  addRelationship(graph, 'B', 'D', { id: 'eBD' });
  addRelationship(graph, 'C', 'D', { id: 'eCD' });
  addRelationship(graph, 'D', 'E', { id: 'eDE' });
  return graph;
}

describe('assignLayers', () => {
  it('assigns deterministic topological layers including isolated nodes', () => {
    expect(assignLayers(fixture())).toEqual({
      layers: { A: 0, B: 1, C: 1, D: 2, E: 3, F: 0 },
      byLayer: [['A', 'F'], ['B', 'C'], ['D'], ['E']],
      hasCycle: false,
      cyclicNodes: [],
    });
  });

  it('falls back to a shared layer for cyclic nodes', () => {
    const graph = fixture();
    graph.edges.length = 0;
    addRelationship(graph, 'A', 'B', { id: 'eAB' });
    addRelationship(graph, 'B', 'C', { id: 'eBC' });
    addRelationship(graph, 'C', 'A', { id: 'eCA' });
    addRelationship(graph, 'D', 'A', { id: 'eDA' });
    expect(assignLayers(graph)).toEqual({
      layers: { A: 1, B: 1, C: 1, D: 0, E: 0, F: 0 },
      byLayer: [['D', 'E', 'F'], ['A', 'B', 'C']],
      hasCycle: true,
      cyclicNodes: ['A', 'B', 'C'],
    });
  });

  it('ignores disabled edges by default', () => {
    const graph = fixture();
    graph.edges.find((edge) => edge.id === 'eDE')!.enabled = false;
    expect(assignLayers(graph).layers.E).toBe(0);
    expect(assignLayers(graph, { enabledOnly: false }).layers.E).toBe(3);
  });
});
