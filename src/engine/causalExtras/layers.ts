import type { CausalGraph, EntityId } from '@/engine/types';
import { adjacency, findCycle, topologicalSort } from '@/utils/graph';

export interface LayerOptions {
  /** Use only enabled relationships when true (default). */
  enabledOnly?: boolean;
}

export interface LayerAssignment {
  /** Layer index per node id, keyed by ascending node id. */
  layers: Record<EntityId, number>;
  /** Node ids grouped by ascending layer index, sorted within each layer. */
  byLayer: EntityId[][];
  hasCycle: boolean;
  /** Sorted ids of one detected cycle (empty in an acyclic graph). */
  cyclicNodes: EntityId[];
}

/** Kahn layering for DAGs; with cycles, acyclic prefixes keep their layers and the remainder share a fallback layer. */
export function assignLayers(graph: CausalGraph, options: LayerOptions = {}): LayerAssignment {
  const ids = [...graph.nodes.map((node) => node.id)].sort(compareIds);
  const nodeIds = new Set(ids);
  const enabledOnly = options.enabledOnly ?? true;
  const edges = graph.edges
    .filter((edge) => !(enabledOnly && !edge.enabled) && nodeIds.has(edge.from) && nodeIds.has(edge.to))
    .map((edge) => ({ id: edge.id, from: edge.from, to: edge.to }));
  const outgoing = adjacency(edges);
  for (const targets of outgoing.values()) targets.sort(compareIds);

  const layers = new Map<EntityId, number>();
  const layerFor = (id: EntityId): number => {
    let layer = 0;
    for (const edge of edges) {
      if (edge.to === id && layers.has(edge.from)) layer = Math.max(layer, layers.get(edge.from)! + 1);
    }
    return layer;
  };

  const order = topologicalSort(ids, edges);
  const hasCycle = order === null;
  let cyclicNodes: EntityId[] = [];

  if (order) {
    for (const id of order) layers.set(id, layerFor(id));
  } else {
    cyclicNodes = [...new Set(findCycle(edges))].sort(compareIds);
    const indegree = new Map<EntityId, number>(ids.map((id) => [id, 0]));
    for (const edge of edges) indegree.set(edge.to, indegree.get(edge.to)! + 1);
    const queue = ids.filter((id) => indegree.get(id) === 0).sort(compareIds);
    while (queue.length > 0) {
      const id = queue.shift()!;
      layers.set(id, layerFor(id));
      for (const next of outgoing.get(id) ?? []) {
        const remaining = indegree.get(next)! - 1;
        indegree.set(next, remaining);
        if (remaining === 0) {
          queue.push(next);
          queue.sort(compareIds);
        }
      }
    }
    const fallbackLayer = Math.max(-1, ...layers.values()) + 1;
    for (const id of ids) if (!layers.has(id)) layers.set(id, fallbackLayer);
  }

  const byLayer: EntityId[][] = [];
  for (const id of ids) {
    const layer = layers.get(id)!;
    while (byLayer.length <= layer) byLayer.push([]);
    byLayer[layer]!.push(id);
  }

  return {
    layers: Object.fromEntries(ids.map((id) => [id, layers.get(id)!])),
    byLayer,
    hasCycle,
    cyclicNodes,
  };
}

function compareIds(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
