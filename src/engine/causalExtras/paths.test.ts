import { describe, expect, it } from 'vitest';
import type { CausalGraph } from '@/engine/types';
import { addRelationship, createCausalGraph } from '@/engine/causal/graph';
import { enumeratePaths } from './paths';

function fixture(): CausalGraph {
  const graph = createCausalGraph('paths');
  graph.nodes.push(
    { id: 'A', kind: 'variable', refId: 'vA', label: 'A' },
    { id: 'B', kind: 'variable', refId: 'vB', label: 'B' },
    { id: 'C', kind: 'variable', refId: 'vC', label: 'C' },
    { id: 'D', kind: 'variable', refId: 'vD', label: 'D' },
    { id: 'E', kind: 'variable', refId: 'vE', label: 'E' },
  );
  addRelationship(graph, 'A', 'B', { id: 'eAB', strength: 0.5 });
  addRelationship(graph, 'A', 'C', { id: 'eAC', strength: -0.5 });
  addRelationship(graph, 'B', 'D', { id: 'eBD', strength: 0.5 });
  addRelationship(graph, 'C', 'D', { id: 'eCD', strength: 0.5 });
  addRelationship(graph, 'D', 'E', { id: 'eDE', strength: 1 });
  addRelationship(graph, 'B', 'A', { id: 'eBA', strength: 0.25 });
  return graph;
}

describe('enumeratePaths', () => {
  it('enumerates simple paths in deterministic order with signed strengths', () => {
    const graph = fixture();
    expect(enumeratePaths(graph, 'A', 'D')).toEqual([
      { nodes: ['A', 'B', 'D'], edges: ['eAB', 'eBD'], signedStrength: 0.25 },
      { nodes: ['A', 'C', 'D'], edges: ['eAC', 'eCD'], signedStrength: -0.25 },
    ]);
    expect(enumeratePaths(graph, 'A', 'E')).toEqual([
      { nodes: ['A', 'B', 'D', 'E'], edges: ['eAB', 'eBD', 'eDE'], signedStrength: 0.25 },
      { nodes: ['A', 'C', 'D', 'E'], edges: ['eAC', 'eCD', 'eDE'], signedStrength: -0.25 },
    ]);
  });

  it('honours depth limits and rejects invalid or trivial endpoints', () => {
    const graph = fixture();
    expect(enumeratePaths(graph, 'A', 'D', { maxDepth: 2 })).toHaveLength(2);
    expect(enumeratePaths(graph, 'A', 'D', { maxDepth: 1 })).toEqual([]);
    expect(enumeratePaths(graph, 'A', 'A')).toEqual([]);
    expect(enumeratePaths(graph, 'A', 'unknown')).toEqual([]);
    expect(enumeratePaths(graph, 'unknown', 'D')).toEqual([]);
  });

  it('excludes disabled edges by default', () => {
    const graph = fixture();
    addRelationship(graph, 'A', 'D', { id: 'eAD', strength: 0.75, enabled: false });
    expect(enumeratePaths(graph, 'A', 'D')).toHaveLength(2);
    expect(enumeratePaths(graph, 'A', 'D', { enabledOnly: false })).toEqual([
      { nodes: ['A', 'D'], edges: ['eAD'], signedStrength: 0.75 },
      { nodes: ['A', 'B', 'D'], edges: ['eAB', 'eBD'], signedStrength: 0.25 },
      { nodes: ['A', 'C', 'D'], edges: ['eAC', 'eCD'], signedStrength: -0.25 },
    ]);
  });
});
