import type { CausalGraph, CausalPath, CausalRelationship, EntityId } from '@/engine/types';
import { combinedSignedWeight } from './weights';

export interface PathOptions {
  /** Maximum number of edges; defaults to node count - 1. */
  maxDepth?: number;
  /** Ignore disabled relationships when true (default). */
  enabledOnly?: boolean;
}

interface OutgoingStep {
  to: EntityId;
  edge: CausalRelationship;
}

/**
 * Enumerates all simple directed paths from `from` to `to` (no repeated nodes).
 * Paths are ordered by edge count, then node ids, then edge ids; `signedStrength`
 * is the signed product of the clamped strengths along the path.
 * A zero-length path (from === to) is not considered a path.
 */
export function enumeratePaths(graph: CausalGraph, from: EntityId, to: EntityId, options: PathOptions = {}): CausalPath[] {
  const nodeIds = new Set(graph.nodes.map((node) => node.id));
  if (from === to || !nodeIds.has(from) || !nodeIds.has(to)) return [];

  const maxDepth = options.maxDepth ?? Math.max(0, graph.nodes.length - 1);
  if (maxDepth <= 0) return [];

  const enabledOnly = options.enabledOnly ?? true;
  const outgoing = new Map<EntityId, OutgoingStep[]>();
  for (const edge of graph.edges) {
    if (enabledOnly && !edge.enabled) continue;
    if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) continue;
    const steps = outgoing.get(edge.from) ?? [];
    steps.push({ to: edge.to, edge });
    outgoing.set(edge.from, steps);
  }
  for (const steps of outgoing.values()) {
    steps.sort((a, b) => compareIds(a.to, b.to) || compareIds(a.edge.id, b.edge.id));
  }

  const paths: CausalPath[] = [];
  const visited = new Set<EntityId>([from]);
  const nodePath: EntityId[] = [from];
  const edgePath: CausalRelationship[] = [];

  const visit = (current: EntityId): void => {
    if (current === to && nodePath.length > 1) {
      paths.push({
        nodes: [...nodePath],
        edges: edgePath.map((edge) => edge.id),
        signedStrength: combinedSignedWeight(edgePath.map((edge) => edge.strength)),
      });
    }
    if (nodePath.length - 1 >= maxDepth) return;
    for (const step of outgoing.get(current) ?? []) {
      if (visited.has(step.to)) continue;
      visited.add(step.to);
      nodePath.push(step.to);
      edgePath.push(step.edge);
      visit(step.to);
      edgePath.pop();
      nodePath.pop();
      visited.delete(step.to);
    }
  };

  visit(from);
  paths.sort((a, b) => a.nodes.length - b.nodes.length || compareStringLists(a.nodes, b.nodes) || compareStringLists(a.edges, b.edges));
  return paths;
}

function compareIds(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function compareStringLists(left: readonly string[], right: readonly string[]): number {
  for (let index = 0; index < Math.min(left.length, right.length); index += 1) {
    const comparison = compareIds(left[index]!, right[index]!);
    if (comparison !== 0) return comparison;
  }
  return left.length - right.length;
}
