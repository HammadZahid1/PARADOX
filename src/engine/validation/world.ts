import type { WorldDefinition, WorldState } from '@/engine/types';
import { combine, failure, requireNumber, requireString, success, type ValidationResult } from './common';
import { validateVariableSet } from './variable';

export function validateWorldState(state: WorldState): ValidationResult {
  const results: ValidationResult[] = [
    requireString(state.id, 'state.id'),
    requireNumber(state.time, 'state.time'),
    requireNumber(state.step, 'state.step'),
    requireNumber(state.seed, 'state.seed'),
  ];
  if (state.time < 0) results.push(failure('state.time', 'Simulation time must be non-negative'));
  if (state.step < 0) results.push(failure('state.step', 'Simulation step must be non-negative'));
  if (state.version < 1) results.push(failure('state.version', 'State version must be positive'));
  for (const event of state.activeEvents) {
    if (event.startedStep > state.step) results.push(failure('state.activeEvents', 'Active event started in the future'));
  }
  return combine(...results);
}

export function validateWorldDefinition(world: WorldDefinition): ValidationResult {
  const results: ValidationResult[] = [
    requireString(world.id, 'world.id'),
    requireString(world.name, 'world.name'),
    requireString(world.domain, 'world.domain'),
    validateVariableSet(world.variables, world.initialState?.variables ?? Object.fromEntries(world.variables.map((variable) => [variable.id, variable.initial]))),
  ];
  const keys = new Set<string>();
  for (const definition of world.variables) {
    if (keys.has(definition.key)) results.push(failure('world.variables', `Duplicate variable key ${definition.key}`));
    keys.add(definition.key);
  }
  return combine(...results);
}

export function stateIntegrity(state: WorldState): ValidationResult {
  const missing = Object.values(state.variables).filter((value) => value === undefined || value === null);
  if (missing.length > 0) return failure('state.variables', 'State contains undefined variables');
  return success();
}
