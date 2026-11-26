import type { Condition, EventEffect, RuleEffect, ScalarValue, VariableChange, VariableDefinition, WorldState } from '@/engine/types';
import { clamp, roundTo } from '@/utils/math';
import { evaluateExpression } from './expression';

export function definitionsByKey(definitions: readonly VariableDefinition[]): Map<string, VariableDefinition> {
  return new Map(definitions.map((definition) => [definition.key, definition]));
}

export function definitionsById(definitions: readonly VariableDefinition[]): Map<string, VariableDefinition> {
  return new Map(definitions.map((definition) => [definition.id, definition]));
}

export function numericVariables(state: WorldState, definitions: readonly VariableDefinition[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const definition of definitions) {
    const value = state.variables[definition.id];
    if (typeof value === 'number') result[definition.key] = value;
  }
  return result;
}

export function evaluateCondition(condition: Condition, state: WorldState, definitions: readonly VariableDefinition[]): boolean {
  const definition = definitionsByKey(definitions).get(condition.variableKey);
  const current = definition ? state.variables[definition.id] : state.variables[condition.variableKey];
  if (current === undefined) return false;
  switch (condition.operator) {
    case 'eq': return current === condition.value;
    case 'neq': return current !== condition.value;
    case 'gt': return typeof current === 'number' && typeof condition.value === 'number' && current > condition.value;
    case 'gte': return typeof current === 'number' && typeof condition.value === 'number' && current >= condition.value;
    case 'lt': return typeof current === 'number' && typeof condition.value === 'number' && current < condition.value;
    case 'lte': return typeof current === 'number' && typeof condition.value === 'number' && current <= condition.value;
    case 'contains': return typeof current === 'string' && current.includes(String(condition.value));
  }
}

function coerce(definition: VariableDefinition, value: ScalarValue): ScalarValue {
  if (definition.type === 'number' || definition.type === 'derived') {
    const numeric = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(numeric)) return definition.initial;
    let result = numeric;
    const min = definition.min ?? definition.constraints?.min;
    const max = definition.max ?? definition.constraints?.max;
    if (min !== undefined || max !== undefined) result = clamp(result, min ?? -Infinity, max ?? Infinity);
    if (definition.constraints?.integer) result = Math.round(result);
    return roundTo(result, 6);
  }
  if (definition.type === 'boolean') return Boolean(value);
  if (definition.constraints?.allowed && typeof value === 'string' && !definition.constraints.allowed.includes(value)) {
    return definition.initial;
  }
  return value;
}

export function setVariable(state: WorldState, definition: VariableDefinition, value: ScalarValue, source: string, reason?: string): { state: WorldState; change?: VariableChange } {
  const previous = state.variables[definition.id] ?? definition.initial;
  const next = coerce(definition, value);
  if (Object.is(previous, next)) return { state };
  const change: VariableChange = {
    variableId: definition.id, from: previous, to: next,
    step: state.step, time: state.time, source, reason,
  };
  return {
    state: { ...state, variables: { ...state.variables, [definition.id]: next } },
    change,
  };
}

function operandFor(effect: EventEffect | RuleEffect): number {
  if ('amount' in effect && typeof effect.amount === 'number') return effect.amount;
  if ('value' in effect && typeof effect.value === 'number') return effect.value;
  if ('factor' in effect && typeof effect.factor === 'number') return effect.factor;
  if ('percent' in effect && typeof effect.percent === 'number') return effect.percent;
  if ('delta' in effect && typeof effect.delta === 'number') return effect.delta;
  return 0;
}

export function applyArithmeticEffect(state: WorldState, definition: VariableDefinition, effect: EventEffect | RuleEffect, source: string, reason?: string): { state: WorldState; change?: VariableChange } {
  const current = state.variables[definition.id] ?? definition.initial;
  const numeric = typeof current === 'number' ? current : Number(current);
  const operand = operandFor(effect);
  let next: ScalarValue = current;
  switch (effect.kind) {
    case 'increase': next = numeric + operand; break;
    case 'decrease': next = numeric - operand; break;
    case 'assign': next = ('value' in effect ? effect.value : undefined) ?? current; break;
    case 'multiply': next = numeric * operand; break;
    case 'percentChange': next = numeric * (1 + operand / 100); break;
    case 'temporary': next = numeric + operand; break;
    default: return { state };
  }
  return setVariable(state, definition, next, source, reason);
}

export function applyEventEffect(state: WorldState, effect: EventEffect, definitions: readonly VariableDefinition[], source: string): { state: WorldState; change?: VariableChange } {
  if (effect.kind === 'log' || effect.kind === 'activate' || effect.kind === 'cancel') return { state };
  if (effect.kind === 'conditional') {
    return evaluateCondition(effect.condition, state, definitions)
      ? applyEventEffect(state, effect.then, definitions, source)
      : effect.otherwise ? applyEventEffect(state, effect.otherwise, definitions, source) : { state };
  }
  const definition = definitionsByKey(definitions).get(effect.variableKey);
  if (!definition) return { state };
  if (effect.kind === 'assign') return setVariable(state, definition, effect.value, source);
  return applyArithmeticEffect(state, definition, effect, source);
}

export function recomputeDerived(state: WorldState, definitions: readonly VariableDefinition[]): { state: WorldState; changes: VariableChange[] } {
  let next = state;
  const changes: VariableChange[] = [];
  for (const definition of definitions) {
    if (definition.type !== 'derived' || !definition.expression) continue;
    try {
      const value = evaluateExpression(definition.expression, numericVariables(next, definitions));
      const result = setVariable(next, definition, value, 'derived', definition.expression);
      next = result.state;
      if (result.change) changes.push(result.change);
    } catch {
      // Malformed derived expressions are ignored; validation surfaces the error separately.
    }
  }
  return { state: next, changes };
}

export function diffVariables(before: WorldState, after: WorldState, definitions: readonly VariableDefinition[]): VariableChange[] {
  const changes: VariableChange[] = [];
  for (const definition of definitions) {
    const from = before.variables[definition.id] ?? definition.initial;
    const to = after.variables[definition.id] ?? definition.initial;
    if (!Object.is(from, to)) {
      changes.push({ variableId: definition.id, from, to, step: after.step, time: after.time, source: 'transition' });
    }
  }
  return changes;
}
