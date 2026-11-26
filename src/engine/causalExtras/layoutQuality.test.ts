import { describe, expect, it } from 'vitest';
import type { CausalGraph } from '@/engine/types';
import { createCausalGraph } from '@/engine/causal/graph';
import type { GraphLayout } from '@/engine/causal/layout';
import { measureLayoutQuality } from './layoutQuality';

function fixture(): CausalGraph {
  const graph = createCausalGraph('layout-quality');
  for (const id of ['A', 'B', 'C', 'D']) {
    graph.nodes.push({ id, kind: 'variable', refId: `v${id}`, label: id });
  }
  return graph;
}

const layout: GraphLayout = { A: { x: 0, y: 0 }, B: { x: 10, y: 0 }, C: { x: 60, y: 0 } };

describe('measureLayoutQuality', () => {
  it('measures overlaps, distances, score and missing nodes deterministically', () => {
    expect(measureLayoutQuality(fixture(), layout)).toEqual({
      nodeCount: 3,
      pairCount: 3,
      overlappingPairs: [['A', 'B']],
      tooClosePairs: [['A', 'B']],
      minDistance: 10,
      averageDistance: 40,
      score: 2 / 3,
      missingNodes: ['D'],
    });
  });

  it('applies custom thresholds', () => {
    const quality = measureLayoutQuality(fixture(), layout, { overlapDistance: 5, minDistance: 100 });
    expect(quality.overlappingPairs).toEqual([]);
    expect(quality.tooClosePairs).toEqual([['A', 'B'], ['A', 'C'], ['B', 'C']]);
    expect(quality.score).toBe(0);
  });

  it('handles empty layouts and non-finite positions', () => {
    expect(measureLayoutQuality(fixture(), {})).toEqual({
      nodeCount: 0,
      pairCount: 0,
      overlappingPairs: [],
      tooClosePairs: [],
      minDistance: 0,
      averageDistance: 0,
      score: 1,
      missingNodes: ['A', 'B', 'C', 'D'],
    });
    const invalid = { A: { x: Number.NaN, y: 0 }, B: { x: 0, y: 0 } };
    expect(measureLayoutQuality(fixture(), invalid).missingNodes).toEqual(['A', 'C', 'D']);
  });
});
