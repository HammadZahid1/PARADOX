import type { CausalGraph } from '@/engine/types';

/** Coerces a finite weight into the signed strength domain [-1, 1]; non-finite values become 0. */
export function clampWeight(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(-1, Math.min(1, value));
}

/** Linearly maps a numeric range onto [-1, 1] and clamps the result. Degenerate ranges map to 0. */
export function normalizeWeight(value: number, min: number, max: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(min) || !Number.isFinite(max) || min === max) return 0;
  return clampWeight(((value - min) / (max - min)) * 2 - 1);
}

export interface NormalizedWeightsOptions {
  /** Source range mapped onto [-1, 1]; defaults to [-1, 1] (identity). */
  range?: readonly [number, number];
  /** Skip disabled relationships when true (default). */
  enabledOnly?: boolean;
}

/** Normalized edge strengths keyed by edge id, ordered by ascending edge id. */
export function normalizedEdgeWeights(graph: CausalGraph, options: NormalizedWeightsOptions = {}): Record<string, number> {
  const [min, max] = options.range ?? [-1, 1];
  const result: Record<string, number> = {};
  const edges = [...graph.edges].sort((a, b) => compareIds(a.id, b.id));
  for (const edge of edges) {
    if ((options.enabledOnly ?? true) && !edge.enabled) continue;
    result[edge.id] = normalizeWeight(edge.strength, min, max);
  }
  return result;
}

/** Signed product of weights (each clamped first); an empty product is the identity 1. */
export function combinedSignedWeight(weights: readonly number[]): number {
  return weights.reduce((product, weight) => product * clampWeight(weight), 1);
}

function compareIds(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
