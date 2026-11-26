import type { CausalGraph, EntityId } from '@/engine/types';
import { breadthFirst } from '@/utils/graph';

export interface ClosureOptions {
  /** Traverse only enabled relationships when true (default). */
  enabledOnly?: boolean;
  /** Include the starting nodes themselves in their reachable sets when true (default false). */
  includeStarts?: boolean;
}

/** Sorted union of nodes reachable from any starting node, excluding starts by default. */
export function reachableFrom(graph: CausalGraph, starts: readonly EntityId[], options: ClosureOptions = {}): EntityId[] {
  const nodeIds = new Set(graph.nodes.map((node) => node.id));
  const enabledOnly = options.enabledOnly ?? true;
  const edges = graph.edges
    .filter((edge) => !(enabledOnly && !edge.enabled) && nodeIds.has(edge.from) && nodeIds.has(edge.to))
    .map((edge) => ({ id: edge.id, from: edge.from, to: edge.to }));

  const reachable = new Set<EntityId>();
  for (const start of [...starts].sort(compareIds)) {
    if (!nodeIds.has(start)) continue;
    for (const id of breadthFirst(start, edges)) {
      if (id === start && !(options.includeStarts ?? false)) continue;
      if (nodeIds.has(id)) reachable.add(id);
    }
  }
  return [...reachable].sort(compareIds);
}

/** Reachable sets for every graph node, keyed by ascending node id. */
export function reachableSets(graph: CausalGraph, options: ClosureOptions = {}): Record<EntityId, EntityId[]> {
  const result: Record<EntityId, EntityId[]> = {};
  for (const node of [...graph.nodes].sort((a, b) => compareIds(a.id, b.id))) {
    result[node.id] = reachableFrom(graph, [node.id], options);
  }
  return result;
}

/** All reachable (from, to) pairs, sorted by source id then target id. */
export function transitiveClosure(graph: CausalGraph, options: ClosureOptions = {}): Array<[EntityId, EntityId]> {
  const pairs: Array<[EntityId, EntityId]> = [];
  for (const [from, targets] of Object.entries(reachableSets(graph, options))) {
    for (const to of targets) pairs.push([from, to]);
  }
  return pairs.sort((a, b) => compareIds(a[0], b[0]) || compareIds(a[1], b[1]));
}

function compareIds(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
