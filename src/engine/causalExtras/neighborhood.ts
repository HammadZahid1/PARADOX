import type { CausalGraph, EntityId } from '@/engine/types';
import { adjacency } from '@/utils/graph';
import { clampWeight } from './weights';

export type NeighborhoodDirection = 'incoming' | 'outgoing';

export interface NeighborhoodOptions {
  /** Traverse only enabled relationships when true (default). */
  enabledOnly?: boolean;
}

export interface NeighborhoodEntry {
  id: EntityId;
  /** Minimal number of hops from the center. */
  distance: number;
  /** Sorted nodes at distance - 1 that connect along a shortest path. */
  viaNodes: EntityId[];
  /** Sorted ids of edges from viaNodes to this node along shortest paths. */
  edgeIds: EntityId[];
  /** Largest absolute clamped strength among those connecting edges. */
  strength: number;
}

export interface Neighborhood {
  centerId: EntityId;
  direction: NeighborhoodDirection;
  maxDepth: number;
  /** Ordered by ascending distance, then ascending node id. */
  nodes: NeighborhoodEntry[];
}

interface TraversalEdge {
  id: EntityId;
  from: EntityId;
  to: EntityId;
  strength: number;
}

/** Multi-hop neighborhood metadata around one node; unreachable nodes are omitted. */
export function kHopNeighborhood(
  graph: CausalGraph,
  centerId: EntityId,
  maxDepth: number,
  direction: NeighborhoodDirection,
  options: NeighborhoodOptions = {},
): Neighborhood {
  const empty: Neighborhood = { centerId, direction, maxDepth, nodes: [] };
  if (!Number.isFinite(maxDepth) || maxDepth <= 0 || !graph.nodes.some((node) => node.id === centerId)) return empty;

  const nodeIds = new Set(graph.nodes.map((node) => node.id));
  const enabledOnly = options.enabledOnly ?? true;
  const edges: TraversalEdge[] = [];
  for (const edge of graph.edges) {
    if (enabledOnly && !edge.enabled) continue;
    if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) continue;
    const from = direction === 'outgoing' ? edge.from : edge.to;
    const to = direction === 'outgoing' ? edge.to : edge.from;
    edges.push({ id: edge.id, from, to, strength: edge.strength });
  }

  const forward = adjacency(edges.map((edge) => ({ id: edge.id, from: edge.from, to: edge.to })));
  const backward = adjacency(edges.map((edge) => ({ id: edge.id, from: edge.to, to: edge.from })));
  for (const targets of forward.values()) targets.sort(compareIds);
  for (const targets of backward.values()) targets.sort(compareIds);

  const distance = new Map<EntityId, number>([[centerId, 0]]);
  const queue: EntityId[] = [centerId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentDepth = distance.get(current)!;
    if (currentDepth >= maxDepth) continue;
    for (const next of forward.get(current) ?? []) {
      if (distance.has(next)) continue;
      distance.set(next, currentDepth + 1);
      queue.push(next);
    }
  }

  const byPair = new Map<string, TraversalEdge[]>();
  for (const edge of edges) {
    const key = pairKey(edge.from, edge.to);
    const list = byPair.get(key) ?? [];
    list.push(edge);
    byPair.set(key, list);
  }
  for (const list of byPair.values()) list.sort((a, b) => compareIds(a.id, b.id));

  const nodes: NeighborhoodEntry[] = [];
  for (const [id, hops] of distance) {
    if (hops === 0) continue;
    const viaNodes = [...new Set(backward.get(id) ?? [])]
      .filter((previous) => distance.get(previous) === hops - 1)
      .sort(compareIds);
    const connecting = viaNodes.flatMap((previous) => byPair.get(pairKey(previous, id)) ?? []);
    nodes.push({
      id,
      distance: hops,
      viaNodes,
      edgeIds: connecting.map((edge) => edge.id).sort(compareIds),
      strength: connecting.reduce((max, edge) => Math.max(max, Math.abs(clampWeight(edge.strength))), 0),
    });
  }
  nodes.sort((a, b) => a.distance - b.distance || compareIds(a.id, b.id));
  return { centerId, direction, maxDepth, nodes };
}

/** Incoming and outgoing neighborhoods for every graph node, keyed by ascending node id. */
export function kHopNeighborhoods(
  graph: CausalGraph,
  maxDepth: number,
  options: NeighborhoodOptions = {},
): Record<EntityId, { incoming: NeighborhoodEntry[]; outgoing: NeighborhoodEntry[] }> {
  const result: Record<EntityId, { incoming: NeighborhoodEntry[]; outgoing: NeighborhoodEntry[] }> = {};
  for (const node of [...graph.nodes].sort((a, b) => compareIds(a.id, b.id))) {
    result[node.id] = {
      incoming: kHopNeighborhood(graph, node.id, maxDepth, 'incoming', options).nodes,
      outgoing: kHopNeighborhood(graph, node.id, maxDepth, 'outgoing', options).nodes,
    };
  }
  return result;
}

function pairKey(from: EntityId, to: EntityId): string {
  return `${from}\u0000${to}`;
}

function compareIds(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
