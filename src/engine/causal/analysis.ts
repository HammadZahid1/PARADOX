import type { CausalGraph, EventRecord, ImpactAnalysis, VariableDefinition, WorldState } from '@/engine/types';
import { definitionsByKey } from '@/engine/core/variables';
import { breadthFirst, findPath } from '@/utils/graph';

export interface EventImpactOptions {
  eventId: string;
  graph: CausalGraph;
  before: WorldState;
  after: WorldState;
  definitions: readonly VariableDefinition[];
  history: readonly EventRecord[];
  propagationSteps: readonly { edgeId: string; fromNode: string; toNode: string; depth: number; relation: string; strength: number }[];
}

/** Transparent, rule-based event impact tracing (not statistical causal inference). */
export function analyzeEventImpact(options: EventImpactOptions): ImpactAnalysis {
  const { eventId, graph, before, after, definitions, history, propagationSteps } = options;
  const byKey = definitionsByKey(definitions);
  const eventRecord = history.filter((record) => record.eventId === eventId).at(-1);
  const affected = new Set<string>(eventRecord?.affectedVariables ?? []);
  const direct = propagationSteps.filter((step) => step.depth === 1);
  const indirect = propagationSteps.filter((step) => step.depth > 1);
  for (const step of propagationSteps) {
    const node = graph.nodes.find((candidate) => candidate.id === step.toNode);
    if (!node) continue;
    const definition = definitions.find((item) => item.id === node.refId);
    if (definition) affected.add(definition.key);
  }
  const changed = definitions.filter((definition) => !Object.is(before.variables[definition.id], after.variables[definition.id]));
  changed.forEach((definition) => affected.add(definition.key));

  const paths = [...affected].flatMap((key) => {
    const definition = byKey.get(key);
    const node = definition ? graph.nodes.find((candidate) => candidate.kind === 'variable' && candidate.refId === definition.id) : undefined;
    if (!node) return [];
    const path = findPath(eventId, node.id, graph.edges.map((edge) => ({ id: edge.id, from: edge.from, to: edge.to })))
      ?? breadthFirst(node.id, graph.edges.map((edge) => ({ id: edge.id, from: edge.from, to: edge.to }))).slice(0, 3);
    const edges = graph.edges.filter((edge) => {
      const index = path.indexOf(edge.from);
      return index >= 0 && path[index + 1] === edge.to;
    });
    const signedStrength = edges.reduce((product, edge) => product * edge.strength, 1);
    return [{ nodes: path, edges: edges.map((edge) => edge.id), signedStrength }];
  });

  return {
    eventId,
    direct: direct as ImpactAnalysis['direct'],
    indirect: indirect as ImpactAnalysis['indirect'],
    maxDepth: propagationSteps.reduce((max, step) => Math.max(max, step.depth), 0),
    affectedVariables: [...affected],
    affectedEvents: history.filter((record) => record.step >= (eventRecord?.step ?? 0)).map((record) => record.eventId),
    paths,
    assumptions: [
      'Impact is derived from authored causal relationships and actual state deltas.',
      'Correlation edges are excluded from propagation and cannot establish causation.',
      'Controlled counterfactual comparisons require an explicit branch with the event removed.',
    ],
  };
}

export function explainRelation(type: string, strength: number): string {
  const label = type.replace(/-/g, ' ');
  const direction = strength < 0 ? 'inverse' : strength > 0 ? 'positive' : 'neutral';
  return `${label} (${direction}, strength ${Math.abs(strength).toFixed(2)})`;
}
