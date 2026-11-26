import type { Scenario } from '@/engine/types';
import { combine, failure, requireString, success, type ValidationResult } from './common';
import { validateEvent } from './events';
import { validateCausalGraph } from './graph';
import { validateVariableSet } from './variable';

export function validateScenario(scenario: Scenario): ValidationResult {
  const results: ValidationResult[] = [
    requireString(scenario.id, 'scenario.id'),
    requireString(scenario.name, 'scenario.name'),
    requireString(scenario.domain, 'scenario.domain'),
    requireString(scenario.worldId, 'scenario.worldId'),
    validateVariableSet(scenario.variables, Object.fromEntries(scenario.variables.map((variable) => [variable.id, variable.initial]))),
    ...scenario.events.map(validateEvent),
  ];
  if (scenario.configuration.maxSteps <= 0) results.push(failure('configuration.maxSteps', 'Max steps must be positive'));
  if (scenario.configuration.stepDuration <= 0) results.push(failure('configuration.stepDuration', 'Step duration must be positive'));
  if (!Number.isFinite(scenario.configuration.seed)) results.push(failure('configuration.seed', 'Seed must be finite'));
  if (scenario.causalGraph) results.push(validateCausalGraph(scenario.causalGraph));
  for (const objective of scenario.objectives) {
    if (!scenario.variables.some((variable) => variable.key === objective.variableKey)) {
      results.push(failure('objective.variableKey', `Unknown variable ${objective.variableKey}`));
    }
  }
  return combine(...results);
}

export function scenarioSummary(scenario: Scenario): string {
  const eventCount = scenario.events.length;
  const variableCount = scenario.variables.length;
  return `${scenario.name}: ${variableCount} variables, ${eventCount} events, ${scenario.configuration.maxSteps} steps`;
}

export function validateScenarioList(scenarios: readonly Scenario[]): ValidationResult {
  const ids = new Set<string>();
  const results: ValidationResult[] = scenarios.map(validateScenario);
  for (const scenario of scenarios) {
    if (ids.has(scenario.id)) results.push(failure('scenario.id', `Duplicate scenario id ${scenario.id}`));
    ids.add(scenario.id);
  }
  return results.length > 0 ? combine(...results) : success();
}
