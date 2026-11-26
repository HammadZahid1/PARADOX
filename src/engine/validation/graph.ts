import type { CausalGraph, CausalRelationship } from '@/engine/types';
import { hasCycle } from '@/utils/graph';
import { combine, failure, requireString, success, type ValidationResult } from './common';

export function validateRelationship(edge: CausalRelationship): ValidationResult {
  const results = [
    requireString(edge.id, 'edge.id'),
    requireString(edge.from, 'edge.from'),
    requireString(edge.to, 'edge.to'),
  ];
  if (edge.strength < -1 || edge.strength > 1 || !Number.isFinite(edge.strength)) {
    results.push(failure('edge.strength', 'Causal strength must be between -1 and 1'));
  }
  if ((edge.delaySteps ?? 0) < 0) results.push(failure('edge.delaySteps', 'Delay must be non-negative'));
  return combine(...results);
}

export function validateCausalGraph(graph: CausalGraph): ValidationResult {
  const nodeIds = new Set(graph.nodes.map((node) => node.id));
  const results: ValidationResult[] = [requireString(graph.id, 'graph.id')];
  for (const node of graph.nodes) results.push(requireString(node.refId, 'node.refId'));
  for (const edge of graph.edges) {
    results.push(validateRelationship(edge));
    if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) {
      results.push(failure(`edge.${edge.id}`, 'Edge references a missing node'));
    }
  }
  const duplicateIds = new Set<string>();
  for (const edge of graph.edges) {
    if (duplicateIds.has(edge.id)) results.push(failure('edge.id', `Duplicate edge id ${edge.id}`));
    duplicateIds.add(edge.id);
  }
  return combine(...results);
}

export function graphCycleWarning(graph: CausalGraph): ValidationResult {
  return hasCycle(graph.edges.map((edge) => ({ id: edge.id, from: edge.from, to: edge.to })))
    ? { valid: true, issues: [{ path: 'graph.edges', message: 'Causal graph contains feedback cycles; propagation will use its depth limit', severity: 'warning' }] }
    : success();
}
