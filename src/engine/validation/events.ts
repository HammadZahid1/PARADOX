import type { Condition, EventEffect, EventTrigger, SimulationEvent } from '@/engine/types';
import { combine, failure, requireProbability, requireString, success, type ValidationResult } from './common';

export function validateCondition(condition: Condition): ValidationResult {
  return combine(
    requireString(condition.id, 'condition.id'),
    requireString(condition.variableKey, 'condition.variableKey'),
  );
}

export function validateEffect(effect: EventEffect): ValidationResult {
  switch (effect.kind) {
    case 'assign':
      return requireString(effect.variableKey, 'effect.variableKey');
    case 'increase':
    case 'decrease':
    case 'multiply':
    case 'percentChange':
    case 'temporary':
      return combine(
        requireString(effect.variableKey, 'effect.variableKey'),
        requireNumberField(effect, 'effect.value'),
      );
    case 'conditional':
      return combine(validateCondition(effect.condition), validateEffect(effect.then), effect.otherwise ? validateEffect(effect.otherwise) : success());
    case 'activate':
    case 'cancel':
      return requireString(effect.eventId, 'effect.eventId');
    case 'log':
      return requireString(effect.message, 'effect.message');
  }
}

function requireNumberField(effect: EventEffect, path: string): ValidationResult {
  const numeric = 'amount' in effect ? effect.amount : 'value' in effect ? effect.value
    : 'factor' in effect ? effect.factor : 'percent' in effect ? effect.percent
      : 'delta' in effect ? effect.delta : undefined;
  return typeof numeric === 'number' && Number.isFinite(numeric)
    ? success()
    : failure(path, 'Effect requires a finite numeric operand');
}

export function validateTrigger(trigger: EventTrigger): ValidationResult {
  switch (trigger.kind) {
    case 'scheduled':
      return trigger.atStep >= 0 ? success() : failure('event.trigger.atStep', 'Scheduled step must be non-negative');
    case 'threshold':
      return combine(requireString(trigger.variableKey, 'trigger.variableKey'), requireNumberField({ kind: 'increase', variableKey: trigger.variableKey, amount: trigger.value }, 'trigger.value'));
    case 'boolean':
      return requireString(trigger.variableKey, 'trigger.variableKey');
    case 'probability':
      return requireProbability(trigger.threshold, 'trigger.threshold');
    case 'dependency':
      return trigger.eventIds.length > 0 ? success() : failure('trigger.eventIds', 'Dependency trigger requires at least one event');
    case 'recurring':
      return trigger.intervalSteps > 0 ? success() : failure('trigger.intervalSteps', 'Recurring interval must be positive');
    case 'cascade':
      return requireString(trigger.parentEventId, 'trigger.parentEventId');
    case 'manual':
      return success();
  }
}

export function validateEvent(event: SimulationEvent): ValidationResult {
  const results: ValidationResult[] = [
    requireString(event.id, 'event.id'),
    requireString(event.name, 'event.name'),
    requireProbability(event.probability, 'event.probability'),
    validateTrigger(event.trigger),
    ...event.conditions.map(validateCondition),
    ...event.effects.map(validateEffect),
    ...(event.outcomes ?? []).flatMap((outcome) => [
      requireString(outcome.id, 'outcome.id'),
      requireProbability(outcome.probability, 'outcome.probability'),
      ...outcome.effects.map(validateEffect),
    ]),
  ];
  if (event.durationSteps !== undefined && event.durationSteps < 0) {
    results.push(failure('event.durationSteps', 'Duration must be non-negative'));
  }
  if (event.cooldownSteps !== undefined && event.cooldownSteps < 0) {
    results.push(failure('event.cooldownSteps', 'Cooldown must be non-negative'));
  }
  return combine(...results);
}
