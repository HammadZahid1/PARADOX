import { describe, expect, it } from 'vitest';
import type { CausalGraph } from '@/engine/types';
import { addRelationship, createCausalGraph } from '@/engine/causal/graph';
import { validateGraphStructure } from './validation';

function graphWithNodes(): CausalGraph {
  const graph = createCausalGraph('validation');
  graph.nodes.push(
    { id: 'A', kind: 'variable', refId: 'vA', label: 'A' },
    { id: 'B', kind: 'variable', refId: 'vB', label: 'B' },
  );
  return graph;
}

describe('validateGraphStructure', () => {
  it('reports self-loops as warnings without invalidating the graph', () => {
    const graph = graphWithNodes();
    addRelationship(graph, 'A', 'B', { id: 'eAB' });
    addRelationship(graph, 'A', 'A', { id: 'eLoop' });
    expect(validateGraphStructure(graph)).toEqual({
      valid: true,
      issues: [{ path: 'edge.eLoop', message: 'Edge eLoop is a self-loop', severity: 'warning' }],
      nodeCount: 2,
      edgeCount: 2,
      danglingEdgeIds: [],
      duplicateEdgeIds: [],
      duplicatePairs: [],
      selfLoopEdgeIds: ['eLoop'],
    });
  });

  it('reports dangling references and duplicate edge pairs as errors', () => {
    const graph = graphWithNodes();
    addRelationship(graph, 'A', 'B', { id: 'eAB' });
    addRelationship(graph, 'A', 'B', { id: 'eDup' });
    addRelationship(graph, 'A', 'Z', { id: 'eDangling' });
    addRelationship(graph, 'Y', 'A', { id: 'eMissing' });
    const report = validateGraphStructure(graph);
    expect(report.valid).toBe(false);
    expect(report.issues.map((issue) => issue.path)).toEqual([
      'edge.eDangling.to', 'edge.eMissing.from', 'edge.eDup',
    ]);
    expect(report.danglingEdgeIds).toEqual(['eDangling', 'eMissing']);
    expect(report.duplicateEdgeIds).toEqual([]);
    expect(report.duplicatePairs).toEqual(['eAB', 'eDup']);
    expect(report.selfLoopEdgeIds).toEqual([]);
  });

  it('reports duplicate edge ids separately', () => {
    const graph = graphWithNodes();
    addRelationship(graph, 'A', 'B', { id: 'eAB' });
    addRelationship(graph, 'B', 'A', { id: 'eAB' });
    const report = validateGraphStructure(graph);
    expect(report.valid).toBe(false);
    expect(report.issues).toEqual([{ path: 'edge.id', message: 'Duplicate edge id eAB', severity: 'error' }]);
    expect(report.duplicateEdgeIds).toEqual(['eAB']);
    expect(report.duplicatePairs).toEqual([]);
  });
});
