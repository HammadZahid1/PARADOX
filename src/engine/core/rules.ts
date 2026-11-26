import type { RuleEffect, SimulationRule, VariableChange, VariableDefinition, WorldState } from '@/engine/types';
import { applyArithmeticEffect, definitionsByKey, evaluateCondition } from './variables';

export interface RuleApplication {
  state: WorldState;
  applied: string[];
  changes: VariableChange[];
  skipped: string[];
}

function hasAllConditions(rule: SimulationRule, state: WorldState, definitions: readonly VariableDefinition[]): boolean {
  const conditions = [...(rule.condition ? [rule.condition] : []), ...(rule.conditions ?? [])];
  return conditions.every((condition) => evaluateCondition(condition, state, definitions));
}

export function applyRuleEffect(state: WorldState, effect: RuleEffect, definitions: readonly VariableDefinition[], source: string): { state: WorldState; change?: VariableChange } {
  const definition = definitionsByKey(definitions).get(effect.variableKey);
  if (!definition) return { state };
  return applyArithmeticEffect(state, definition, effect, source, `rule:${effect.kind}`);
}

/** Execute enabled rules in descending priority order. */
export function applyRules(state: WorldState, rules: readonly SimulationRule[], definitions: readonly VariableDefinition[], source = 'rule'): RuleApplication {
  let next = state;
  const applied: string[] = [];
  const skipped: string[] = [];
  const changes: VariableChange[] = [];
  const ordered = [...rules].filter((rule) => rule.enabled).sort((a, b) => b.priority - a.priority);
  for (const rule of ordered) {
    if (!hasAllConditions(rule, next, definitions)) {
      skipped.push(rule.id);
      continue;
    }
    applied.push(rule.id);
    for (const effect of rule.effects) {
      const result = applyRuleEffect(next, effect, definitions, `${source}:${rule.name}`);
      next = result.state;
      if (result.change) changes.push(result.change);
    }
  }
  return { state: next, applied, skipped, changes };
}

export function ruleCoverage(rules: readonly SimulationRule[], definitions: readonly VariableDefinition[]): number {
  const known = new Set(definitions.map((definition) => definition.key));
  const referenced = new Set(rules.flatMap((rule) => rule.effects.map((effect) => effect.variableKey)));
  if (known.size === 0) return 0;
  return [...referenced].filter((key) => known.has(key)).length / known.size;
}
