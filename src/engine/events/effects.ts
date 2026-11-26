import type { EventEffect, EventEvaluation, ScalarValue, SimulationEvent, VariableDefinition, WorldState } from '@/engine/types';
import type { SeededRandom } from '@/engine/random/rng';
import { weightedPick } from '@/engine/random/distributions';
import { applyEventEffect, definitionsByKey, evaluateCondition, setVariable } from '@/engine/core/variables';
import { createId } from '@/utils/id';

export interface EffectApplication {
  state: WorldState;
  changedVariables: string[];
  activatedEvents: string[];
  cancelledEvents: string[];
  log: string[];
  outcomeId?: string;
}

function inverseEffect(effect: EventEffect): EventEffect {
  switch (effect.kind) {
    case 'increase': return { kind: 'decrease', variableKey: effect.variableKey, amount: effect.amount };
    case 'decrease': return { kind: 'increase', variableKey: effect.variableKey, amount: effect.amount };
    default: return effect;
  }
}

function resolveEffect(effect: EventEffect, state: WorldState, definitions: readonly VariableDefinition[]): EventEffect | null {
  if (effect.kind !== 'conditional') return effect;
  const branch = evaluateCondition(effect.condition, state, definitions) ? effect.then : effect.otherwise;
  return branch ? resolveEffect(branch, state, definitions) : null;
}

export function applyEventEffects(
  event: SimulationEvent,
  state: WorldState,
  definitions: readonly VariableDefinition[],
  random: SeededRandom,
  evaluation: EventEvaluation,
): EffectApplication {
  let next = state;
  const changedVariables: string[] = [];
  const activatedEvents: string[] = [];
  const cancelledEvents: string[] = [];
  const log: string[] = [];
  let effects: readonly EventEffect[] = event.effects;
  let outcomeId: string | undefined;

  if (event.outcomes && event.outcomes.length > 0) {
    const outcome = weightedPick(random, event.outcomes.map((item) => ({ value: item, weight: item.probability })));
    if (outcome) {
      effects = outcome.effects;
      outcomeId = outcome.id;
    }
  }

  for (const rawEffect of effects) {
    const effect = resolveEffect(rawEffect, next, definitions);
    if (!effect) continue;
    if (effect.kind === 'log') {
      log.push(effect.message);
      continue;
    }
    if (effect.kind === 'activate') {
      activatedEvents.push(effect.eventId);
      continue;
    }
    if (effect.kind === 'cancel') {
      cancelledEvents.push(effect.eventId);
      continue;
    }
    if (effect.kind === 'temporary') {
      const definition = definitionsByKey(definitions).get(effect.variableKey);
      const result = applyEventEffect(next, { kind: 'increase', variableKey: effect.variableKey, amount: effect.delta }, definitions, event.id);
      next = result.state;
      if (result.change) changedVariables.push(definition?.key ?? effect.variableKey);
      next = {
        ...next,
        activeEvents: [...next.activeEvents, {
          instanceId: createId('active'), eventId: event.id, name: event.name,
          startedAt: next.time, startedStep: next.step,
          endsAt: next.time + effect.durationSteps,
          revertAtStep: next.step + effect.durationSteps,
          severity: event.severity, source: 'conditional',
          temporaryEffect: inverseEffect({ kind: 'increase', variableKey: effect.variableKey, amount: effect.delta }),
        }],
      };
      continue;
    }
    const result = applyEventEffect(next, effect, definitions, event.id);
    next = result.state;
    if (result.change && 'variableKey' in effect) {
      changedVariables.push(definitionsByKey(definitions).get(effect.variableKey)?.key ?? effect.variableKey);
    }
  }

  evaluation.effectsApplied = changedVariables.length;
  return { state: next, changedVariables, activatedEvents, cancelledEvents, log, outcomeId };
}

export function expireTemporaryEffects(state: WorldState, step: number, definitions: readonly VariableDefinition[]): WorldState {
  let next = state;
  const remaining: typeof state.activeEvents = [];
  for (const active of state.activeEvents) {
    if (active.revertAtStep !== undefined && step >= active.revertAtStep && active.temporaryEffect) {
      next = applyEventEffect(next, active.temporaryEffect, definitions, 'expiry').state;
      continue;
    }
    if (active.endsAt !== undefined && next.time > active.endsAt) continue;
    remaining.push(active);
  }
  return { ...next, activeEvents: remaining };
}

export function assignVariable(state: WorldState, definition: VariableDefinition, value: ScalarValue, source: string): WorldState {
  return setVariable(state, definition, value, source).state;
}
