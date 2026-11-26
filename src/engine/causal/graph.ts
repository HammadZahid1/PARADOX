import type { CausalGraph, CausalNode, CausalRelationship, EntityId, EventOutcome, SimulationEvent, VariableDefinition } from '@/engine/types';
import { createId } from '@/utils/id';
import { findPath, topologicalSort } from '@/utils/graph';

export function createCausalGraph(name: string): CausalGraph {
  return { id: createId('cg'), name, nodes: [], edges: [], createdAt: Date.now() };
}

export function addVariableNode(graph: CausalGraph, definition: VariableDefinition): CausalNode {
  const existing = graph.nodes.find((node) => node.kind === 'variable' && node.refId === definition.id);
  if (existing) return existing;
  const node: CausalNode = { id: createId('node'), kind: 'variable', refId: definition.id, label: definition.name };
  graph.nodes.push(node);
  return node;
}

export function addEventNode(graph: CausalGraph, event: SimulationEvent): CausalNode {
  const existing = graph.nodes.find((node) => node.kind === 'event' && node.refId === event.id);
  if (existing) return existing;
  const node: CausalNode = { id: createId('node'), kind: 'event', refId: event.id, label: event.name };
  graph.nodes.push(node);
  return node;
}

export function addRelationship(graph: CausalGraph, from: EntityId, to: EntityId, relationship: Partial<CausalRelationship> = {}): CausalRelationship {
  const edge: CausalRelationship = {
    id: relationship.id ?? createId('edge'),
    from, to,
    type: relationship.type ?? 'influences',
    strength: relationship.strength ?? 0.5,
    condition: relationship.condition,
    delaySteps: relationship.delaySteps ?? 0,
    description: relationship.description,
    enabled: relationship.enabled ?? true,
    authored: relationship.authored ?? true,
  };
  graph.edges.push(edge);
  return edge;
}

export function removeRelationship(graph: CausalGraph, edgeId: EntityId): CausalGraph {
  return { ...graph, edges: graph.edges.filter((edge) => edge.id !== edgeId) };
}

export function nodeByReference(graph: CausalGraph, kind: CausalNode['kind'], refId: EntityId): CausalNode | undefined {
  return graph.nodes.find((node) => node.kind === kind && node.refId === refId);
}

export function graphPath(graph: CausalGraph, start: EntityId, goal: EntityId): EntityId[] | null {
  return findPath(start, goal, graph.edges.map((edge) => ({ id: edge.id, from: edge.from, to: edge.to })));
}

export function causalOrder(graph: CausalGraph): EntityId[] | null {
  return topologicalSort(
    graph.nodes.map((node) => node.id),
    graph.edges.filter((edge) => edge.enabled).map((edge) => ({ id: edge.id, from: edge.from, to: edge.to })),
  );
}

/** Builds a starting graph from variables and events; correlations are never inferred automatically. */
export function buildGraphFromDefinitions(name: string, definitions: readonly VariableDefinition[], events: readonly SimulationEvent[]): CausalGraph {
  const graph = createCausalGraph(name);
  definitions.forEach((definition) => addVariableNode(graph, definition));
  events.forEach((event) => {
    const eventNode = addEventNode(graph, event);
    const effects = [...event.effects, ...(event.outcomes ?? []).flatMap((outcome: EventOutcome) => outcome.effects)];
    for (const effect of effects) {
      if (!('variableKey' in effect)) continue;
      const definition = definitions.find((item) => item.key === effect.variableKey);
      if (!definition) continue;
      addRelationship(graph, eventNode.id, nodeByReference(graph, 'variable', definition.id)!.id, {
        type: 'causes', strength: 1, authored: false,
        description: `Effect: ${effect.kind} on ${definition.name}`,
      });
    }
  });
  return graph;
}
