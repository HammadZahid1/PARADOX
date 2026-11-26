import type { DecisionAlternative, DecisionRecord, EntityId, RealityBranch, VariableDefinition, WorldState } from '@/engine/types';
import type { SeededRandom } from '@/engine/random/rng';
import { weightedPick } from '@/engine/random/distributions';
import { applyEventEffects } from '@/engine/events/effects';
import { createId } from '@/utils/id';
import { branchFromState } from './branch';

export function createDecisionAlternative(name: string, probability: number, effects: DecisionAlternative['outcome']['effects'], description?: string): DecisionAlternative {
  return {
    id: createId('alt'), name, description, probability,
    outcome: { id: createId('out'), name, probability, effects, description },
  };
}

export function createDecision(name: string, state: WorldState, alternatives: readonly DecisionAlternative[], selectedId: EntityId, rationale?: string): DecisionRecord {
  return {
    id: createId('decision'), name, step: state.step, time: state.time,
    selectedAlternativeId: selectedId, alternatives: [...alternatives], rationale,
  };
}

export function selectAlternative(alternatives: readonly DecisionAlternative[], random: SeededRandom, forcedId?: EntityId): DecisionAlternative | undefined {
  if (forcedId) return alternatives.find((alternative) => alternative.id === forcedId);
  return weightedPick(random, alternatives.map((alternative) => ({ value: alternative, weight: alternative.probability })));
}

export interface DecisionApplication {
  branch: RealityBranch;
  decision: DecisionRecord;
  changedVariables: string[];
}

export function branchFromDecision(
  parent: RealityBranch,
  name: string,
  alternatives: readonly DecisionAlternative[],
  random: SeededRandom,
  definitions: readonly VariableDefinition[],
  forcedId?: EntityId,
  rationale?: string,
): DecisionApplication {
  const selected = selectAlternative(alternatives, random, forcedId);
  if (!selected) throw new Error('Decision requires at least one alternative');
  const decision = createDecision(name, parent.currentState, alternatives, selected.id, rationale);
  const pseudoEvent = {
    id: decision.id, name: `${name}: ${selected.name}`, type: 'manual' as const,
    trigger: { kind: 'manual' as const }, probability: 1, conditions: [],
    effects: selected.outcome.effects, dependencies: [], priority: 10,
    severity: 'notice' as const, enabled: true,
  };
  const application = applyEventEffects(pseudoEvent, parent.currentState, definitions, random, {
    eventId: decision.id, step: parent.currentState.step, fired: true, reason: 'decision', effectsApplied: 0,
  });
  const branch = branchFromState(parent, application.state, `${name} — ${selected.name}`, `decision:${decision.id}`, decision.id);
  branch.decisions = [...parent.decisions, decision];
  return { branch, decision, changedVariables: application.changedVariables };
}
