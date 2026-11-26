import { describe, expect, it } from 'vitest';
import type { CausalGraph } from '@/engine/types';
import { addRelationship, createCausalGraph } from '@/engine/causal/graph';
import { clampWeight, combinedSignedWeight, normalizeWeight, normalizedEdgeWeights } from './weights';

function fixture(): CausalGraph {
  const graph = createCausalGraph('weights');
  graph.nodes.push(
    { id: 'A', kind: 'variable', refId: 'vA', label: 'A' },
    { id: 'B', kind: 'variable', refId: 'vB', label: 'B' },
  );
  addRelationship(graph, 'A', 'B', { id: 'e01', strength: 0.25 });
  addRelationship(graph, 'B', 'A', { id: 'e02', strength: -0.5 });
  addRelationship(graph, 'A', 'A', { id: 'e03', strength: 2, enabled: false });
  addRelationship(graph, 'B', 'B', { id: 'e04', strength: 0.75 });
  return graph;
}

describe('weights', () => {
  it('clamps finite values and coerces non-finite values to zero', () => {
    expect(clampWeight(1.7)).toBe(1);
    expect(clampWeight(-2)).toBe(-1);
    expect(clampWeight(0.25)).toBe(0.25);
    expect(clampWeight(Number.NaN)).toBe(0);
    expect(clampWeight(Number.POSITIVE_INFINITY)).toBe(0);
  });

  it('normalizes ranges onto the signed domain', () => {
    expect(normalizeWeight(0, 0, 1)).toBe(-1);
    expect(normalizeWeight(0.5, 0, 1)).toBe(0);
    expect(normalizeWeight(1, 0, 1)).toBe(1);
    expect(normalizeWeight(5, 0, 10)).toBe(0);
    expect(normalizeWeight(2, 0, 1)).toBe(1);
    expect(normalizeWeight(0.5, 1, 1)).toBe(0);
  });

  it('normalizes graph edge weights deterministically', () => {
    expect(normalizedEdgeWeights(fixture())).toEqual({ e01: 0.25, e02: -0.5, e04: 0.75 });
    expect(normalizedEdgeWeights(fixture(), { range: [0, 1] })).toEqual({ e01: -0.5, e02: -1, e04: 0.5 });
    expect(normalizedEdgeWeights(fixture(), { enabledOnly: false })).toEqual({ e01: 0.25, e02: -0.5, e03: 1, e04: 0.75 });
  });

  it('combines signed weights multiplicatively', () => {
    expect(combinedSignedWeight([])).toBe(1);
    expect(combinedSignedWeight([0.5, -0.5, 2])).toBe(-0.25);
    expect(combinedSignedWeight([0.5, Number.NaN, 0.5])).toBe(0);
  });
});
