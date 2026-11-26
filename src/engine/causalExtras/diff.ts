import type { CausalGraph, EntityId } from '@/engine/types';

export type ChangeKind = 'added' | 'removed' | 'changed';

export interface NodeChange {
  id: EntityId;
  kind: ChangeKind;
  /** Sorted names of the fields whose values differ; empty for add/remove. */
  fields: string[];
}

export interface EdgeChange extends NodeChange {}

export interface GraphDiff {
  /** Node changes ordered by ascending node id. */
  nodes: NodeChange[];
  /** Edge changes ordered by ascending edge id. */
  edges: EdgeChange[];
}

const NODE_FIELDS = ['kind', 'refId', 'label', 'description', 'x', 'y'] as const;
const EDGE_FIELDS = ['from', 'to', 'type', 'strength', 'condition', 'delaySteps', 'description', 'enabled', 'authored'] as const;

/** Structural diff of two graphs; unchanged nodes/edges are omitted. */
export function diffCausalGraphs(before: CausalGraph, after: CausalGraph): GraphDiff {
  const beforeNodes = new Map(before.nodes.map((node) => [node.id, node]));
  const afterNodes = new Map(after.nodes.map((node) => [node.id, node]));
  const beforeEdges = new Map(before.edges.map((edge) => [edge.id, edge]));
  const afterEdges = new Map(after.edges.map((edge) => [edge.id, edge]));

  const nodes: NodeChange[] = [];
  for (const id of [...new Set([...beforeNodes.keys(), ...afterNodes.keys()])].sort(compareIds)) {
    const previous = beforeNodes.get(id);
    const next = afterNodes.get(id);
    if (!previous) nodes.push({ id, kind: 'added', fields: [] });
    else if (!next) nodes.push({ id, kind: 'removed', fields: [] });
    else {
      const fields = changedFields(previous, next, NODE_FIELDS);
      if (fields.length > 0) nodes.push({ id, kind: 'changed', fields });
    }
  }

  const edges: EdgeChange[] = [];
  for (const id of [...new Set([...beforeEdges.keys(), ...afterEdges.keys()])].sort(compareIds)) {
    const previous = beforeEdges.get(id);
    const next = afterEdges.get(id);
    if (!previous) edges.push({ id, kind: 'added', fields: [] });
    else if (!next) edges.push({ id, kind: 'removed', fields: [] });
    else {
      const fields = changedFields(previous, next, EDGE_FIELDS);
      if (fields.length > 0) edges.push({ id, kind: 'changed', fields });
    }
  }

  return { nodes, edges };
}

function changedFields<T extends object>(before: T, after: T, fields: readonly (keyof T)[]): string[] {
  return fields
    .filter((field) => !sameValue(before[field], after[field]))
    .map((field) => String(field))
    .sort(compareIds);
}

function sameValue(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (typeof left === 'object' && left !== null && typeof right === 'object' && right !== null) {
    return JSON.stringify(left) === JSON.stringify(right);
  }
  return false;
}

function compareIds(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
