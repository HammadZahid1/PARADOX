import { describe, expect, it } from 'vitest';
import type { CausalGraph } from '@/engine/types';
import { addRelationship, createCausalGraph } from '@/engine/causal/graph';
import { rankImpact } from './impactScore';

function fixture(): CausalGraph {
  const graph = createCausalGraph('impact');
  for (const id of ['A', 'B', 'C', 'D']) {
    graph.nodes.push({ id, kind: 'variable', refId: `v${id}`, label: id });
  }
  addRelationship(graph, 'A', 'B', { id: 'eAB', strength: 0.5 });
  addRelationship(graph, 'B', 'C', { id: 'eBC', strength: 0.5 });
  addRelationship(graph, 'A', 'C', { id: 'eAC', strength: 0.25 });
  addRelationship(graph, 'C', 'D', { id: 'eCD', strength: -1 });
  addRelationship(graph, 'B', 'D', { id: 'eBD', strength: 0.5 });
  return graph;
}

describe('rankImpact', () => {
  it('ranks nodes by direct and indirect path influence with stable ties', () => {
    expect(rankImpact(fixture())).toEqual([
      { id: 'D', directInfluence: 1.5, indirectInfluence: 1.25, score: 2.75, pathCount: 6 },
      { id: 'C', directInfluence: 0.75, indirectInfluence: 0.25, score: 1, pathCount: 3 },
      { id: 'B', directInfluence: 0.5, indirectInfluence: 0, score: 0.5, pathCount: 1 },
      { id: 'A', directInfluence: 0, indirectInfluence: 0, score: 0, pathCount: 0 },
    ]);
  });

  it('honours the path depth limit', () => {
    const ranked = rankImpact(fixture(), { maxDepth: 2 });
    expect(ranked[0]).toEqual({ id: 'D', directInfluence: 1.5, indirectInfluence: 1, score: 2.5, pathCount: 5 });
    expect(ranked.map((entry) => entry.id)).toEqual(['D', 'C', 'B', 'A']);
  });

  it('ignores disabled relationships', () => {
    const graph = fixture();
    graph.edges.find((edge) => edge.id === 'eCD')!.enabled = false;
    expect(rankImpact(graph)[0]).toEqual({ id: 'C', directInfluence: 0.75, indirectInfluence: 0.25, score: 1, pathCount: 3 });
  });
});
