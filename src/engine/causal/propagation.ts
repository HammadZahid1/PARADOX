import type { CausalGraph, CausalNode, CausalPropagationStep, CausalRelationType, VariableDefinition, WorldState } from '@/engine/types';
import { applyEventEffect, definitionsById, evaluateCondition, numericVariables } from '@/engine/core/variables';

export interface PendingPropagation {
  edgeId: string;
  targetNodeId: string;
  amount: number;
  dueStep: number;
  depth: number;
}

export interface PropagationResult {
  state: WorldState;
  steps: CausalPropagationStep[];
  pending: PendingPropagation[];
  cycleArrested: boolean;
}

const modifiers: Partial<Record<CausalRelationType, number>> = {
  causes: 1,
  influences: 1,
  amplifies: 1.5,
  reduces: -1,
  prevents: -0.75,
  enables: 1,
  'depends-on': 1,
};

function targetNode(edge: { from: string; to: string; type: CausalRelationType }, changed: CausalNode, nodes: readonly CausalNode[]): CausalNode | undefined {
  if (edge.from === changed.id && edge.to !== changed.id) return nodes.find((node) => node.id === edge.to);
  if (edge.type === 'depends-on' && edge.to === changed.id) return nodes.find((node) => node.id === edge.from);
  return undefined;
}

/** Rule-based causal propagation. Correlation edges are descriptive and never mutate state. */
export function propagateChange(
  graph: CausalGraph,
  state: WorldState,
  changedVariableKey: string,
  magnitude: number,
  definitions: readonly VariableDefinition[],
  limit = 8,
): PropagationResult {
  if (!Number.isFinite(magnitude) || magnitude === 0 || limit <= 0) {
    return { state, steps: [], pending: [], cycleArrested: false };
  }
  const byId = definitionsById(definitions);
  const nodeForVariable = (id: string): CausalNode | undefined => graph.nodes.find((node) => node.kind === 'variable' && node.refId === id);
  const variableForNode = (node: CausalNode): VariableDefinition | undefined => byId.get(node.refId);
  const changedDefinition = definitions.find((definition) => definition.key === changedVariableKey);
  const sourceNode = changedDefinition ? nodeForVariable(changedDefinition.id) : undefined;
  if (!sourceNode) return { state, steps: [], pending: [], cycleArrested: false };

  let next = state;
  const steps: CausalPropagationStep[] = [];
  const pending: PendingPropagation[] = [];
  const visited = new Set<string>([sourceNode.id]);
  const queue: Array<{ node: CausalNode; amount: number; depth: number }> = [{ node: sourceNode, amount: magnitude, depth: 0 }];
  let cycleArrested = false;

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.depth >= limit) {
      cycleArrested = true;
      continue;
    }
    for (const edge of graph.edges) {
      if (!edge.enabled || edge.type === 'correlates-with' || edge.type === 'custom') continue;
      const relation = { ...edge };
      const nextNode = targetNode(relation, current.node, graph.nodes);
      if (!nextNode || visited.has(nextNode.id)) continue;
      if (relation.condition && !evaluateCondition(relation.condition, next, definitions)) continue;
      const targetDefinition = variableForNode(nextNode);
      if (!targetDefinition) continue;
      const modifier = modifiers[relation.type] ?? 1;
      let amount = current.amount * relation.strength * modifier;
      if (relation.type === 'enables' && current.amount <= 0) amount = 0;
      if (amount === 0) continue;
      if ((relation.delaySteps ?? 0) > 0) {
        pending.push({ edgeId: edge.id, targetNodeId: nextNode.id, amount, dueStep: state.step + relation.delaySteps!, depth: current.depth + 1 });
        visited.add(nextNode.id);
        continue;
      }
      const before = next.variables[targetDefinition.id] ?? numericVariables(next, definitions)[targetDefinition.key] ?? 0;
      const applied = applyEventEffect(next, { kind: 'increase', variableKey: targetDefinition.key, amount }, definitions, 'causal');
      next = applied.state;
      const after = next.variables[targetDefinition.id] ?? before;
      if (typeof before === 'number' && typeof after === 'number' && before !== after) {
        steps.push({
          edgeId: edge.id, fromNode: current.node.id, toNode: nextNode.id,
          before, after, depth: current.depth + 1,
          relation: relation.type, strength: relation.strength,
        });
      }
      visited.add(nextNode.id);
      if (typeof before === 'number' && typeof after === 'number' && after !== before) {
        queue.push({ node: nextNode, amount: after - before, depth: current.depth + 1 });
      }
    }
  }
  return { state: next, steps, pending, cycleArrested };
}

export function applyPendingPropagations(
  state: WorldState,
  pending: readonly PendingPropagation[],
  step: number,
  graph: CausalGraph,
  definitions: readonly VariableDefinition[],
): { state: WorldState; steps: CausalPropagationStep[] } {
  const byId = definitionsById(definitions);
  let next = state;
  const steps: CausalPropagationStep[] = [];
  for (const item of pending) {
    if (item.dueStep > step) continue;
    const node = graph.nodes.find((candidate) => candidate.id === item.targetNodeId);
    const definition = node ? byId.get(node.refId) : undefined;
    if (!definition) continue;
    const before = next.variables[definition.id];
    const applied = applyEventEffect(next, { kind: 'increase', variableKey: definition.key, amount: item.amount }, definitions, 'causal-delayed');
    next = applied.state;
    const after = next.variables[definition.id];
    if (typeof before === 'number' && typeof after === 'number') {
      steps.push({ edgeId: item.edgeId, fromNode: item.targetNodeId, toNode: item.targetNodeId, before, after, depth: item.depth, relation: 'influences', strength: item.amount });
    }
  }
  return { state: next, steps };
}
