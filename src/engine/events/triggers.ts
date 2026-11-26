import type { EventEvaluation, EventRecord, SimulationEvent, VariableDefinition, WorldState } from '@/engine/types';
import type { SeededRandom } from '@/engine/random/rng';
import { definitionsByKey, evaluateCondition } from '@/engine/core/variables';
import { roundTo } from '@/utils/math';

export interface TriggerContext {
  state: WorldState;
  definitions: readonly VariableDefinition[];
  random: SeededRandom;
  step: number;
  history: readonly EventRecord[];
  mode: 'deterministic' | 'probabilistic';
}

export function evaluateTrigger(event: SimulationEvent, context: TriggerContext): EventEvaluation {
  const { state, definitions, random, step, history, mode } = context;
  const trigger = event.trigger;
  const base = { eventId: event.id, step, effectsApplied: 0 };
  if (!event.enabled) return { ...base, fired: false, reason: 'disabled' };

  let structuralFired = false;
  switch (trigger.kind) {
    case 'manual':
      structuralFired = false;
      break;
    case 'scheduled':
      structuralFired = step === trigger.atStep
        && (trigger.atTime === undefined || Math.abs(state.time - trigger.atTime) < 1e-9);
      break;
    case 'threshold': {
      const definition = definitionsByKey(definitions).get(trigger.variableKey);
      const value = definition ? state.variables[definition.id] : state.variables[trigger.variableKey];
      const numeric = typeof value === 'number' ? value : Number(value);
      const threshold = trigger.value;
      structuralFired = trigger.operator === 'gt' ? numeric > threshold
        : trigger.operator === 'gte' ? numeric >= threshold
          : trigger.operator === 'lt' ? numeric < threshold
            : trigger.operator === 'lte' ? numeric <= threshold
              : trigger.operator === 'eq' ? numeric === threshold : numeric !== threshold;
      break;
    }
    case 'boolean': {
      const definition = definitionsByKey(definitions).get(trigger.variableKey);
      const value = definition ? state.variables[definition.id] : state.variables[trigger.variableKey];
      structuralFired = value === trigger.expected;
      break;
    }
    case 'probability':
      structuralFired = trigger.perStep || step === 0;
      break;
    case 'dependency': {
      const firedIds = new Set(history.map((record) => record.eventId));
      structuralFired = trigger.requireAll === false
        ? trigger.eventIds.some((id) => firedIds.has(id))
        : trigger.eventIds.every((id) => firedIds.has(id));
      break;
    }
    case 'recurring': {
      const start = trigger.startStep ?? 0;
      const interval = Math.max(1, trigger.intervalSteps);
      const occurrences = history.filter((record) => record.eventId === event.id).length;
      structuralFired = step >= start && (step - start) % interval === 0
        && (trigger.maxOccurrences === undefined || occurrences < trigger.maxOccurrences);
      break;
    }
    case 'cascade':
      structuralFired = history.some((record) => record.eventId === trigger.parentEventId)
        && step >= (trigger.delaySteps ?? 0);
      break;
  }

  if (!structuralFired) return { ...base, fired: false, reason: `${trigger.kind}:not-due` };

  const conditionsMet = event.conditions.every((condition) => evaluateCondition(condition, state, definitions));
  if (!conditionsMet) return { ...base, fired: false, reason: 'conditions-unmet' };

  const probability = mode === 'deterministic' ? (event.probability >= 1 ? 1 : 0) : event.probability;
  const roll = mode === 'deterministic' ? 0 : random.next();
  const fired = roll < probability;
  return {
    ...base,
    fired,
    probability: roundTo(probability, 4),
    reason: fired ? `${trigger.kind}:fired` : 'probability:not-selected',
  };
}

export function cooldownActive(event: SimulationEvent, step: number, history: readonly EventRecord[]): boolean {
  if (!event.cooldownSteps || event.cooldownSteps <= 0) return false;
  const last = history.filter((record) => record.eventId === event.id).at(-1);
  return last !== undefined && step - last.step < event.cooldownSteps;
}
