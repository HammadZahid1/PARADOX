import { describe, expect, it } from 'vitest';
import type { CausalGraph } from '@/engine/types';
import { addRelationship, createCausalGraph } from '@/engine/causal/graph';
import { diffCausalGraphs } from './diff';

function graphWithNodes(name: string, ids: readonly string[]): CausalGraph {
  const graph = createCausalGraph(name);
  for (const id of ids) graph.nodes.push({ id, kind: 'variable', refId: `v${id}`, label: id });
  return graph;
}

describe('diffCausalGraphs', () => {
  it('reports added, removed and changed nodes and edges in id order', () => {
    const before = graphWithNodes('before', ['A', 'B', 'C']);
    addRelationship(before, 'A', 'B', { id: 'e1', strength: 0.5 });
    addRelationship(before, 'B', 'C', { id: 'e2', strength: -0.5 });
    addRelationship(before, 'C', 'A', { id: 'e3', strength: 1 });

    const after = graphWithNodes('after', ['A', 'B', 'D']);
    after.nodes[0]!.label = 'Alpha';
    addRelationship(after, 'A', 'B', { id: 'e1', strength: 0.75, type: 'causes' });
    addRelationship(after, 'C', 'A', { id: 'e3', strength: 1 });
    addRelationship(after, 'A', 'D', { id: 'e4' });

    expect(diffCausalGraphs(before, after)).toEqual({
      nodes: [
        { id: 'A', kind: 'changed', fields: ['label'] },
        { id: 'C', kind: 'removed', fields: [] },
        { id: 'D', kind: 'added', fields: [] },
      ],
      edges: [
        { id: 'e1', kind: 'changed', fields: ['strength', 'type'] },
        { id: 'e2', kind: 'removed', fields: [] },
        { id: 'e4', kind: 'added', fields: [] },
      ],
    });
  });

  it('returns empty changes for equivalent graphs and sorts changed fields', () => {
    const before = graphWithNodes('before', ['A']);
    addRelationship(before, 'A', 'A', { id: 'e1', strength: 0.5 });
    const after = graphWithNodes('after', ['A']);
    addRelationship(after, 'A', 'A', { id: 'e1', strength: 0.5 });
    expect(diffCausalGraphs(before, after)).toEqual({ nodes: [], edges: [] });

    after.nodes[0]!.label = 'Renamed';
    after.nodes[0]!.y = 5;
    after.nodes[0]!.x = 1;
    expect(diffCausalGraphs(before, after).nodes).toEqual([
      { id: 'A', kind: 'changed', fields: ['label', 'x', 'y'] },
    ]);
  });
});
