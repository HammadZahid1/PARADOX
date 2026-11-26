import { describe, expect, it } from 'vitest';
import type { CausalGraph } from '@/engine/types';
import { addRelationship, createCausalGraph } from '@/engine/causal/graph';
import { nodeCentralities } from './centrality';

function fixture(): CausalGraph {
  const graph = createCausalGraph('centrality');
  for (const id of ['A', 'B', 'C', 'D']) {
    graph.nodes.push({ id, kind: 'variable', refId: `v${id}`, label: id });
  }
  addRelationship(graph, 'A', 'B', { id: 'eAB' });
  addRelationship(graph, 'A', 'C', { id: 'eAC' });
  addRelationship(graph, 'B', 'D', { id: 'eBD' });
  addRelationship(graph, 'C', 'D', { id: 'eCD' });
  return graph;
}

describe('nodeCentralities', () => {
  it('returns degrees and normalized betweenness in ascending id order', () => {
    expect(nodeCentralities(fixture())).toEqual([
      { id: 'A', inDegree: 0, outDegree: 2, degree: 2, betweenness: 0 },
      { id: 'B', inDegree: 1, outDegree: 1, degree: 2, betweenness: 1 / 12 },
      { id: 'C', inDegree: 1, outDegree: 1, degree: 2, betweenness: 1 / 12 },
      { id: 'D', inDegree: 2, outDegree: 0, degree: 2, betweenness: 0 },
    ]);
  });

  it('ignores disabled edges by default', () => {
    const graph = fixture();
    const disabled = graph.edges.find((edge) => edge.id === 'eAC')!;
    disabled.enabled = false;
    const scores = nodeCentralities(graph);
    expect(scores.map((score) => score.betweenness)).toEqual([0, 1 / 6, 0, 0]);
    expect(scores.map((score) => score.outDegree)).toEqual([1, 1, 1, 0]);
    expect(nodeCentralities(graph, { enabledOnly: false }).map((score) => score.betweenness)).toEqual([0, 1 / 12, 1 / 12, 0]);
  });
});
