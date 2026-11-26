import type { CausalGraph, EntityId } from '@/engine/types';
import { adjacency, nodeDegrees } from '@/utils/graph';

export interface CentralityOptions {
  /** Consider only enabled relationships when true (default). */
  enabledOnly?: boolean;
}

export interface NodeCentrality {
  id: EntityId;
  inDegree: number;
  outDegree: number;
  degree: number;
  /** Fraction of ordered shortest directed paths passing through the node, normalized over (n-1)(n-2). */
  betweenness: number;
}

/**
 * Degree and Brandes-style betweenness scores, ordered by ascending node id.
 * Parallel edges count as separate shortest paths; disabled and dangling edges are ignored.
 */
export function nodeCentralities(graph: CausalGraph, options: CentralityOptions = {}): NodeCentrality[] {
  const ids = [...graph.nodes.map((node) => node.id)].sort(compareIds);
  const nodeIds = new Set(ids);
  const enabledOnly = options.enabledOnly ?? true;
  const edges = graph.edges
    .filter((edge) => !(enabledOnly && !edge.enabled) && nodeIds.has(edge.from) && nodeIds.has(edge.to))
    .map((edge) => ({ id: edge.id, from: edge.from, to: edge.to }));
  const outgoing = adjacency(edges);
  for (const targets of outgoing.values()) targets.sort(compareIds);

  const degrees = nodeDegrees(ids, edges);
  const betweenness = new Map<EntityId, number>(ids.map((id) => [id, 0]));

  for (const source of ids) {
    const sigma = new Map<EntityId, number>(ids.map((id) => [id, 0]));
    const depth = new Map<EntityId, number>();
    const predecessors = new Map<EntityId, EntityId[]>();
    const stack: EntityId[] = [];
    const queue: EntityId[] = [source];
    sigma.set(source, 1);
    depth.set(source, 0);

    while (queue.length > 0) {
      const current = queue.shift()!;
      stack.push(current);
      const currentDepth = depth.get(current)!;
      for (const next of outgoing.get(current) ?? []) {
        if (!sigma.has(next)) continue;
        const nextSigma = sigma.get(next)!;
        if (nextSigma === 0) {
          depth.set(next, currentDepth + 1);
          queue.push(next);
        }
        if (depth.get(next) === currentDepth + 1) {
          sigma.set(next, nextSigma + sigma.get(current)!);
          const preds = predecessors.get(next) ?? [];
          preds.push(current);
          predecessors.set(next, preds);
        }
      }
    }

    const delta = new Map<EntityId, number>(ids.map((id) => [id, 0]));
    while (stack.length > 0) {
      const current = stack.pop()!;
      const currentSigma = sigma.get(current)!;
      for (const pred of predecessors.get(current) ?? []) {
        const contribution = (sigma.get(pred)! / currentSigma) * (1 + delta.get(current)!);
        delta.set(pred, delta.get(pred)! + contribution);
      }
      if (current !== source) betweenness.set(current, betweenness.get(current)! + delta.get(current)!);
    }
  }

  const normalizer = ids.length > 2 ? (ids.length - 1) * (ids.length - 2) : 1;
  return ids.map((id) => {
    const degree = degrees[id] ?? { in: 0, out: 0 };
    return {
      id,
      inDegree: degree.in,
      outDegree: degree.out,
      degree: degree.in + degree.out,
      betweenness: betweenness.get(id)! / normalizer,
    };
  });
}

function compareIds(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
