import { describe, expect, it } from 'vitest';
import type { CausalGraph } from '@/engine/types';
import { addRelationship, createCausalGraph } from '@/engine/causal/graph';
import { reachableFrom, reachableSets, transitiveClosure } from './closure';

function fixture(): CausalGraph {
  const graph = createCausalGraph('closure');
  for (const id of ['A', 'B', 'C', 'D', 'E', 'F']) {
    graph.nodes.push({ id, kind: 'variable', refId: `v${id}`, label: id });
  }
  addRelationship(graph, 'A', 'B', { id: 'eAB' });
  addRelationship(graph, 'B', 'C', { id: 'eBC' });
  addRelationship(graph, 'C', 'D', { id: 'eCD' });
  addRelationship(graph, 'A', 'E', { id: 'eAE' });
  addRelationship(graph, 'E', 'D', { id: 'eED' });
  return graph;
}

describe('transitive closure', () => {
  it('returns sorted reachable sets and closure pairs', () => {
    const graph = fixture();
    expect(reachableFrom(graph, ['A'])).toEqual(['B', 'C', 'D', 'E']);
    expect(reachableFrom(graph, ['C', 'E'])).toEqual(['D']);
    expect(reachableFrom(graph, ['A'], { includeStarts: true })).toEqual(['A', 'B', 'C', 'D', 'E']);
    expect(reachableFrom(graph, ['unknown'])).toEqual([]);
    expect(reachableSets(graph)).toEqual({
      A: ['B', 'C', 'D', 'E'],
      B: ['C', 'D'],
      C: ['D'],
      D: [],
      E: ['D'],
      F: [],
    });
    expect(transitiveClosure(graph)).toEqual([
      ['A', 'B'], ['A', 'C'], ['A', 'D'], ['A', 'E'],
      ['B', 'C'], ['B', 'D'],
      ['C', 'D'],
      ['E', 'D'],
    ]);
  });

  it('respects disabled relationships', () => {
    const graph = fixture();
    graph.edges.find((edge) => edge.id === 'eCD')!.enabled = false;
    graph.edges.find((edge) => edge.id === 'eED')!.enabled = false;
    expect(reachableFrom(graph, ['A'])).toEqual(['B', 'C', 'E']);
    expect(reachableFrom(graph, ['E'])).toEqual([]);
    expect(transitiveClosure(graph)).not.toContainEqual(['C', 'D']);
    expect(transitiveClosure(graph, { enabledOnly: false })).toContainEqual(['C', 'D']);
  });
});
