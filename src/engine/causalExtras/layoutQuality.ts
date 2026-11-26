import type { CausalGraph, EntityId } from '@/engine/types';
import type { GraphLayout } from '@/engine/causal/layout';

export interface LayoutQualityOptions {
  /** Centers closer than this distance are overlapping (default 20). */
  overlapDistance?: number;
  /** Centers closer than this distance are too close (default 40). */
  minDistance?: number;
}

export interface LayoutQuality {
  nodeCount: number;
  pairCount: number;
  /** Lexicographically ordered id pairs closer than overlapDistance. */
  overlappingPairs: Array<[EntityId, EntityId]>;
  /** Lexicographically ordered id pairs closer than minDistance. */
  tooClosePairs: Array<[EntityId, EntityId]>;
  minDistance: number;
  averageDistance: number;
  /** Fraction of pairs that satisfy minDistance; 1 when fewer than two nodes are placed. */
  score: number;
  /** Sorted graph node ids with a missing or non-finite position. */
  missingNodes: EntityId[];
}

/** Distance-based quality metrics for a graph layout; finite and deterministic. */
export function measureLayoutQuality(graph: CausalGraph, layout: GraphLayout, options: LayoutQualityOptions = {}): LayoutQuality {
  const overlapDistance = options.overlapDistance ?? 20;
  const minDistance = options.minDistance ?? 40;
  const missingNodes = graph.nodes
    .filter((node) => {
      const point = layout[node.id];
      return !point || !Number.isFinite(point.x) || !Number.isFinite(point.y);
    })
    .map((node) => node.id)
    .sort(compareIds);
  const missing = new Set(missingNodes);
  const placed = graph.nodes.map((node) => node.id).filter((id) => !missing.has(id)).sort(compareIds);

  const overlappingPairs: Array<[EntityId, EntityId]> = [];
  const tooClosePairs: Array<[EntityId, EntityId]> = [];
  let distanceSum = 0;
  let closest = Number.POSITIVE_INFINITY;
  let pairCount = 0;

  for (let first = 0; first < placed.length; first += 1) {
    for (let second = first + 1; second < placed.length; second += 1) {
      const left = layout[placed[first]!]!;
      const right = layout[placed[second]!]!;
      const distance = Math.hypot(left.x - right.x, left.y - right.y);
      const pair: [EntityId, EntityId] = [placed[first]!, placed[second]!];
      pairCount += 1;
      distanceSum += distance;
      closest = Math.min(closest, distance);
      if (distance < overlapDistance) overlappingPairs.push(pair);
      if (distance < minDistance) tooClosePairs.push(pair);
    }
  }

  return {
    nodeCount: placed.length,
    pairCount,
    overlappingPairs,
    tooClosePairs,
    minDistance: pairCount === 0 ? 0 : closest,
    averageDistance: pairCount === 0 ? 0 : distanceSum / pairCount,
    score: pairCount === 0 ? 1 : (pairCount - tooClosePairs.length) / pairCount,
    missingNodes,
  };
}

function compareIds(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
