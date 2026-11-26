import type { CausalGraph, EntityId } from '@/engine/types';
import type { ValidationIssue, ValidationResult } from '@/engine/validation/common';

export interface GraphStructureReport extends ValidationResult {
  nodeCount: number;
  edgeCount: number;
  /** Edge ids whose endpoints are not declared nodes, sorted by id. */
  danglingEdgeIds: EntityId[];
  /** Edge ids occurring more than once, sorted by id. */
  duplicateEdgeIds: EntityId[];
  /** Edge ids sharing the same (from, to, type) pair, sorted by id. */
  duplicatePairs: EntityId[];
  /** Edge ids whose endpoints are identical, sorted by id. */
  selfLoopEdgeIds: EntityId[];
}

/** Structural report: dangling references and duplicates are errors, self-loops are warnings. */
export function validateGraphStructure(graph: CausalGraph): GraphStructureReport {
  const nodeIds = new Set(graph.nodes.map((node) => node.id));
  const issues: ValidationIssue[] = [];
  const edges = [...graph.edges].sort((a, b) =>
    compareIds(a.id, b.id) || compareIds(a.from, b.from) || compareIds(a.to, b.to) || compareIds(a.type, b.type));

  const danglingEdgeIds = new Set<EntityId>();
  for (const edge of edges) {
    let dangling = false;
    if (!nodeIds.has(edge.from)) {
      issues.push({ path: `edge.${edge.id}.from`, message: `Edge ${edge.id} references missing node ${edge.from}`, severity: 'error' });
      dangling = true;
    }
    if (!nodeIds.has(edge.to)) {
      issues.push({ path: `edge.${edge.id}.to`, message: `Edge ${edge.id} references missing node ${edge.to}`, severity: 'error' });
      dangling = true;
    }
    if (dangling) danglingEdgeIds.add(edge.id);
  }

  const seenIds = new Set<EntityId>();
  const duplicateEdgeIds = new Set<EntityId>();
  for (const edge of edges) {
    if (seenIds.has(edge.id)) duplicateEdgeIds.add(edge.id);
    seenIds.add(edge.id);
  }
  for (const id of [...duplicateEdgeIds].sort(compareIds)) {
    issues.push({ path: 'edge.id', message: `Duplicate edge id ${id}`, severity: 'error' });
  }

  const firstByPair = new Map<string, EntityId>();
  const duplicatePairs = new Set<EntityId>();
  for (const edge of edges) {
    const key = `${edge.from}\u0000${edge.to}\u0000${edge.type}`;
    const first = firstByPair.get(key);
    if (first !== undefined) {
      duplicatePairs.add(first);
      duplicatePairs.add(edge.id);
      issues.push({ path: `edge.${edge.id}`, message: `Duplicate ${edge.type} edge from ${edge.from} to ${edge.to}`, severity: 'error' });
    } else {
      firstByPair.set(key, edge.id);
    }
  }

  const selfLoopEdgeIds = new Set<EntityId>();
  for (const edge of edges) {
    if (edge.from !== edge.to) continue;
    selfLoopEdgeIds.add(edge.id);
    issues.push({ path: `edge.${edge.id}`, message: `Edge ${edge.id} is a self-loop`, severity: 'warning' });
  }

  return {
    valid: !issues.some((issue) => issue.severity === 'error'),
    issues,
    nodeCount: graph.nodes.length,
    edgeCount: graph.edges.length,
    danglingEdgeIds: [...danglingEdgeIds].sort(compareIds),
    duplicateEdgeIds: [...duplicateEdgeIds].sort(compareIds),
    duplicatePairs: [...duplicatePairs].sort(compareIds),
    selfLoopEdgeIds: [...selfLoopEdgeIds].sort(compareIds),
  };
}

function compareIds(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
