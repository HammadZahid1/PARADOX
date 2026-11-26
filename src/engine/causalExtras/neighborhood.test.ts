import { describe, expect, it } from 'vitest';
import type { CausalGraph } from '@/engine/types';
import { addRelationship, createCausalGraph } from '@/engine/causal/graph';
import { kHopNeighborhood, kHopNeighborhoods } from './neighborhood';

function fixture(): CausalGraph {
  const graph = createCausalGraph('neighborhood');
  for (const id of ['A', 'B', 'C', 'D', 'E']) {
    graph.nodes.push({ id, kind: 'variable', refId: `v${id}`, label: id });
  }
  addRelationship(graph, 'A', 'B', { id: 'eAB', strength: 0.5 });
  addRelationship(graph, 'A', 'C', { id: 'eAC', strength: -0.5 });
  addRelationship(graph, 'B', 'D', { id: 'eBD', strength: 1 });
  addRelationship(graph, 'C', 'D', { id: 'eCD', strength: 0.25 });
  addRelationship(graph, 'D', 'E', { id: 'eDE', strength: 0.5 });
  addRelationship(graph, 'E', 'B', { id: 'eEB', strength: 0.25 });
  return graph;
}

describe('kHopNeighborhood', () => {
  it('collects outgoing metadata by minimal distance', () => {
    expect(kHopNeighborhood(fixture(), 'A', 2, 'outgoing')).toEqual({
      centerId: 'A',
      direction: 'outgoing',
      maxDepth: 2,
      nodes: [
        { id: 'B', distance: 1, viaNodes: ['A'], edgeIds: ['eAB'], strength: 0.5 },
        { id: 'C', distance: 1, viaNodes: ['A'], edgeIds: ['eAC'], strength: 0.5 },
        { id: 'D', distance: 2, viaNodes: ['B', 'C'], edgeIds: ['eBD', 'eCD'], strength: 1 },
      ],
    });
  });

  it('collects incoming metadata with reversed direction', () => {
    expect(kHopNeighborhood(fixture(), 'D', 2, 'incoming')).toEqual({
      centerId: 'D',
      direction: 'incoming',
      maxDepth: 2,
      nodes: [
        { id: 'B', distance: 1, viaNodes: ['D'], edgeIds: ['eBD'], strength: 1 },
        { id: 'C', distance: 1, viaNodes: ['D'], edgeIds: ['eCD'], strength: 0.25 },
        { id: 'A', distance: 2, viaNodes: ['B', 'C'], edgeIds: ['eAB', 'eAC'], strength: 0.5 },
        { id: 'E', distance: 2, viaNodes: ['B'], edgeIds: ['eEB'], strength: 0.25 },
      ],
    });
  });

  it('builds neighborhoods for every node and respects options', () => {
    const graph = fixture();
    const all = kHopNeighborhoods(graph, 1);
    expect(Object.keys(all)).toEqual(['A', 'B', 'C', 'D', 'E']);
    expect(all.A).toEqual({
      incoming: [],
      outgoing: [
        { id: 'B', distance: 1, viaNodes: ['A'], edgeIds: ['eAB'], strength: 0.5 },
        { id: 'C', distance: 1, viaNodes: ['A'], edgeIds: ['eAC'], strength: 0.5 },
      ],
    });
    expect(kHopNeighborhood(graph, 'A', 0, 'outgoing').nodes).toEqual([]);
    expect(kHopNeighborhood(graph, 'unknown', 2, 'outgoing').nodes).toEqual([]);
    graph.edges.find((edge) => edge.id === 'eAC')!.enabled = false;
    expect(kHopNeighborhood(graph, 'A', 2, 'outgoing').nodes).toEqual([
      { id: 'B', distance: 1, viaNodes: ['A'], edgeIds: ['eAB'], strength: 0.5 },
      { id: 'D', distance: 2, viaNodes: ['B'], edgeIds: ['eBD'], strength: 1 },
    ]);
  });
});
